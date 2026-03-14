const cron = require("node-cron");
const Pothole = require("../models/Pothole");
const { getGrievanceStatus } = require("../services/cpgramsService");

/**
 * N.E.T.R.A. — cron/cpgramsSync.js
 * 
 * Background worker that periodically polls the CPGRAMS API to check the status 
 * of auto-escalated grievances. Syncs "Resolved" tickets back to N.E.T.R.A.
 */

// Run every hour to check status
// In production, this might be less frequent (e.g., '0 */6 * * *') to save API limits.
const SYNC_SCHEDULE = "0 * * * *"; 

async function syncGrievances() {
  console.log("⏱️  [CPGRAMS-SYNC] Starting periodic status sync...");

  try {
    // Find all potholes that have a grievance ID but are not yet fixed/resolved
    const activeEscalations = await Pothole.find({
      grievanceId: { $exists: true, $ne: null },
      status: { $ne: "Fixed" }
    });

    if (activeEscalations.length === 0) {
      console.log("⏱️  [CPGRAMS-SYNC] No active escalations to sync.");
      return;
    }

    console.log(`⏱️  [CPGRAMS-SYNC] Found ${activeEscalations.length} active escalations. Polling CPGRAMS...`);

    let resolvedCount = 0;

    for (const pothole of activeEscalations) {
      const officialStatus = await getGrievanceStatus(pothole.grievanceId);

      if (officialStatus === "Resolved") {
        console.log(`✅  [CPGRAMS-SYNC] Ticket ${pothole.grievanceId} marked as Resolved by Government.`);
        
        // Update N.E.T.R.A Database
        pothole.status = "Fixed";
        // Optionally update the repair image if CPGRAMS provides one
        await pothole.save();
        
        resolvedCount++;
      }
    }

    console.log(`⏱️  [CPGRAMS-SYNC] Run complete. ${resolvedCount} tickets fully resolved by CPGRAMS.`);

  } catch (error) {
    console.error("❌  [CPGRAMS-SYNC] Error during sync run:", error);
  }
}

function startSyncJob() {
  console.log(`🕒 [CPGRAMS-SYNC] Initialized. Schedule: ${SYNC_SCHEDULE}`);
  cron.schedule(SYNC_SCHEDULE, syncGrievances);
}

module.exports = { startSyncJob, syncGrievances };
