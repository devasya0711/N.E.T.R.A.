require("dotenv").config();
console.log("Raw ALLOWED_ORIGINS:", process.env.ALLOWED_ORIGINS);
console.log("Split and Trimmed:", (process.env.ALLOWED_ORIGINS || "http://localhost:5173").split(",").map((o) => o.trim()));
