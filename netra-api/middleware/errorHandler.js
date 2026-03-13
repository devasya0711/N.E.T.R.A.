/**
 * N.E.T.R.A. API — middleware/errorHandler.js
 * Centralised 404 and error handling middleware for Express.
 */

"use strict";

/**
 * notFound — catches any request that reached no route handler.
 */
function notFound(req, res, next) {
  const err = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  err.statusCode = 404;
  next(err);
}

/**
 * errorHandler — global error handler.
 * Express identifies this as an error handler because it has exactly 4 parameters.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: messages,
    });
  }

  // Mongoose bad ObjectId cast
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: `Invalid value for field '${err.path}': ${err.value}`,
    });
  }

  // CORS rejection
  if (err.message && err.message.startsWith("CORS:")) {
    return res.status(403).json({ success: false, message: err.message });
  }

  const statusCode = err.statusCode || err.status || 500;

  // Hide internal details in production
  const message =
    statusCode === 500 && process.env.NODE_ENV === "production"
      ? "An internal server error occurred"
      : err.message || "Internal Server Error";

  if (statusCode === 500) {
    console.error("[Error]", err);
  }

  res.status(statusCode).json({ success: false, message });
}

module.exports = { notFound, errorHandler };
