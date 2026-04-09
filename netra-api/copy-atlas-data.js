#!/usr/bin/env node
"use strict";

const { MongoClient, MongoServerError } = require("mongodb");

const SOURCE_URI =
  process.env.SOURCE_URI ||
  "mongodb+srv://ronakkumar290_db_user:aUtjwbysx5RE63hz@netra.gmbwjpr.mongodb.net/netra?retryWrites=true&w=majority&appName=NETRA";
const TARGET_URI =
  process.env.TARGET_URI ||
  "mongodb+srv://devasyakachru007:Devas2529@netra.miu5a94.mongodb.net/?appName=NETRA";
const SOURCE_DB_NAME = process.env.SOURCE_DB || "netra";
const TARGET_DB_NAME = process.env.TARGET_DB || "netra";
const BATCH_SIZE = Number(process.env.BATCH_SIZE || 500);

function stableStringify(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function indexSignature(index) {
  const relevant = {
    key: index.key,
    unique: !!index.unique,
    sparse: !!index.sparse,
    expireAfterSeconds: index.expireAfterSeconds,
    partialFilterExpression: index.partialFilterExpression,
    collation: index.collation,
    weights: index.weights,
    wildcardProjection: index.wildcardProjection,
    hidden: !!index.hidden,
  };

  return stableStringify(relevant);
}

async function ensureCollection(targetDb, collectionInfo) {
  const existing = await targetDb.listCollections({ name: collectionInfo.name }, { nameOnly: false }).toArray();
  if (existing.length > 0) {
    return { existed: true, type: existing[0].type || "collection" };
  }

  if (collectionInfo.type === "view") {
    const options = collectionInfo.options || {};
    await targetDb.createCollection(collectionInfo.name, {
      viewOn: options.viewOn,
      pipeline: options.pipeline || [],
      collation: options.collation,
    });
    return { existed: false, type: "view" };
  }

  const createOptions = { ...(collectionInfo.options || {}) };
  delete createOptions.validator;
  delete createOptions.validationLevel;
  delete createOptions.validationAction;

  try {
    await targetDb.createCollection(collectionInfo.name, createOptions);
  } catch (error) {
    if (error.codeName !== "NamespaceExists") {
      console.warn(
        `[WARN] createCollection fallback for ${collectionInfo.name}: ${error.message}`
      );
    }
    await targetDb.createCollection(collectionInfo.name).catch((fallbackError) => {
      if (fallbackError.codeName !== "NamespaceExists") {
        throw fallbackError;
      }
    });
  }

  return { existed: false, type: "collection" };
}

async function ensureIndexes(sourceCollection, targetCollection, collectionName) {
  const sourceIndexes = await sourceCollection.indexes();
  const targetIndexes = await targetCollection.indexes().catch(() => []);
  const targetSignatures = new Set(targetIndexes.map(indexSignature));

  let created = 0;

  for (const index of sourceIndexes) {
    if (index.name === "_id_") {
      continue;
    }

    if (targetSignatures.has(indexSignature(index))) {
      continue;
    }

    const options = {
      name: index.name,
      unique: index.unique,
      sparse: index.sparse,
      expireAfterSeconds: index.expireAfterSeconds,
      partialFilterExpression: index.partialFilterExpression,
      collation: index.collation,
      weights: index.weights,
      wildcardProjection: index.wildcardProjection,
      hidden: index.hidden,
      background: false,
    };

    Object.keys(options).forEach((key) => {
      if (options[key] === undefined) {
        delete options[key];
      }
    });

    try {
      await targetCollection.createIndex(index.key, options);
      created += 1;
      console.log(`[INDEX] ${collectionName}: created ${index.name}`);
    } catch (error) {
      if (error instanceof MongoServerError && error.codeName === "IndexOptionsConflict") {
        console.warn(`[WARN] ${collectionName}: index conflict for ${index.name}, skipped`);
        continue;
      }

      if (error instanceof MongoServerError && error.codeName === "IndexKeySpecsConflict") {
        console.warn(`[WARN] ${collectionName}: index key conflict for ${index.name}, skipped`);
        continue;
      }

      throw error;
    }
  }

  return created;
}

async function copyDocuments(sourceCollection, targetCollection, collectionName) {
  const totalSourceDocs = await sourceCollection.countDocuments();
  let processed = 0;
  let inserted = 0;

  const cursor = sourceCollection.find({}).batchSize(BATCH_SIZE);

  try {
    let batch = [];

    for await (const doc of cursor) {
      batch.push(doc);

      if (batch.length >= BATCH_SIZE) {
        const result = await writeBatch(targetCollection, batch);
        processed += batch.length;
        inserted += result.upsertedCount;
        console.log(
          `[COPY] ${collectionName}: processed ${processed}/${totalSourceDocs}, inserted ${inserted}`
        );
        batch = [];
      }
    }

    if (batch.length > 0) {
      const result = await writeBatch(targetCollection, batch);
      processed += batch.length;
      inserted += result.upsertedCount;
      console.log(
        `[COPY] ${collectionName}: processed ${processed}/${totalSourceDocs}, inserted ${inserted}`
      );
    }
  } finally {
    await cursor.close();
  }

  return { totalSourceDocs, processed, inserted, skipped: processed - inserted };
}

async function writeBatch(targetCollection, docs) {
  const operations = docs.map((doc) => ({
    updateOne: {
      filter: { _id: doc._id },
      update: { $setOnInsert: doc },
      upsert: true,
    },
  }));

  return targetCollection.bulkWrite(operations, { ordered: false });
}

async function main() {
  const sourceClient = new MongoClient(SOURCE_URI);
  const targetClient = new MongoClient(TARGET_URI);

  const summary = {
    collectionsSeen: 0,
    collectionsCopied: 0,
    viewsCreated: 0,
    indexesCreated: 0,
    docsProcessed: 0,
    docsInserted: 0,
    docsSkipped: 0,
  };

  try {
    console.log(`[START] Source DB: ${SOURCE_DB_NAME}`);
    console.log(`[START] Target DB: ${TARGET_DB_NAME}`);
    console.log(`[START] Batch size: ${BATCH_SIZE}`);

    await sourceClient.connect();
    await targetClient.connect();

    const sourceDb = sourceClient.db(SOURCE_DB_NAME);
    const targetDb = targetClient.db(TARGET_DB_NAME);

    const collections = await sourceDb.listCollections({}, { nameOnly: false }).toArray();
    const filteredCollections = collections.filter((collectionInfo) => !collectionInfo.name.startsWith("system."));

    summary.collectionsSeen = filteredCollections.length;

    for (const collectionInfo of filteredCollections) {
      console.log(`\n[COLLECTION] ${collectionInfo.name} (${collectionInfo.type || "collection"})`);

      const ensureResult = await ensureCollection(targetDb, collectionInfo);

      if (ensureResult.type === "view") {
        summary.viewsCreated += ensureResult.existed ? 0 : 1;
        console.log(
          `[VIEW] ${collectionInfo.name}: ${ensureResult.existed ? "already exists" : "created"}`
        );
        continue;
      }

      const sourceCollection = sourceDb.collection(collectionInfo.name);
      const targetCollection = targetDb.collection(collectionInfo.name);

      const createdIndexes = await ensureIndexes(
        sourceCollection,
        targetCollection,
        collectionInfo.name
      );
      summary.indexesCreated += createdIndexes;

      const docSummary = await copyDocuments(
        sourceCollection,
        targetCollection,
        collectionInfo.name
      );

      summary.collectionsCopied += 1;
      summary.docsProcessed += docSummary.processed;
      summary.docsInserted += docSummary.inserted;
      summary.docsSkipped += docSummary.skipped;

      console.log(
        `[DONE] ${collectionInfo.name}: source=${docSummary.totalSourceDocs}, inserted=${docSummary.inserted}, skipped=${docSummary.skipped}`
      );
    }

    console.log("\n[SUMMARY]");
    console.log(`Collections seen: ${summary.collectionsSeen}`);
    console.log(`Collections copied: ${summary.collectionsCopied}`);
    console.log(`Views created: ${summary.viewsCreated}`);
    console.log(`Indexes created: ${summary.indexesCreated}`);
    console.log(`Documents processed: ${summary.docsProcessed}`);
    console.log(`Documents inserted: ${summary.docsInserted}`);
    console.log(`Documents skipped: ${summary.docsSkipped}`);
    console.log("[SUCCESS] Copy finished without deleting or overwriting target data.");
  } catch (error) {
    console.error("[ERROR] Copy failed:", error);
    process.exitCode = 1;
  } finally {
    await Promise.allSettled([sourceClient.close(), targetClient.close()]);
    console.log("[CLOSE] MongoDB connections closed.");
  }
}

main();
