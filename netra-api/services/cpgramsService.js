/**
 * N.E.T.R.A. — services/cpgramsService.js
 * 
 * Bridges N.E.T.R.A. pothole detection with the official CPGRAMS API.
 * Uses a mock toggle (TEST_MODE) to prevent spamming the live government portal.
 */

const fetch = require('node-fetch');

const CPGRAMS_API_BASE = "https://pgportal.gov.in/api/v1"; // Example base URL based on docs
const API_KEY = process.env.CPGRAMS_API_KEY;

// To prevent spamming the live government portal during testing/demos
const TEST_MODE = process.env.NODE_ENV !== "production" || process.env.CPGRAMS_TEST_MODE === "true";

/**
 * Maps a N.E.T.R.A. highway string to a CPGRAMS Ministry/Department Code.
 * Example codes (mocked for this implementation): 
 *  - MIN_RTH = Ministry of Road Transport & Highways (NHAI)
 *  - STATE_PWD = State Public Works Department
 */
function getDepartmentCode(highwayName) {
  if (!highwayName) return "STATE_PWD";
  if (highwayName.toLowerCase().startsWith("nh")) return "MIN_RTH"; // National Highway
  return "STATE_PWD"; // State Highway or City Road
}

/**
 * Submits a new grievance to CPGRAMS.
 * @param {Object} potholeData - Details of the pothole
 * @returns {Promise<string>} - The official Grievance ID
 */
async function fileComplaint(potholeData) {
  const departmentCode = getDepartmentCode(potholeData.highwayName);
  
  const payload = {
    subject: `CRITICAL ROAD HAZARD: Deep Pothole detected on ${potholeData.locationDescription}`,
    description: `N.E.T.R.A. Autonomous AI has detected a critical Category ${potholeData.severityScore} pothole.\n\n` +
                 `Location: ${potholeData.locationDescription}\n` +
                 `Coordinates: ${potholeData.location.coordinates[1]}, ${potholeData.location.coordinates[0]}\n` +
                 `Estimated Depth: ${potholeData.depthCm} cm\n` +
                 `Danger Index: ${potholeData.dangerIndex}/100\n\n` +
                 `Immediate repair required to prevent fatal accidents. Automated filing via N.E.T.R.A.`,
    department_code: departmentCode,
    priority: "High",
    category: "Road Maintenance",
    // Image attachment logic would go here if CPGRAMS supports base64/multipart uploads
  };

  console.log(`[CPGRAMS-BRIDGE] Triggered Auto-Escalation for ${potholeData.potholeId} to ${departmentCode}`);

  if (TEST_MODE) {
    // Return a realistic looking mock ID
    const mockId = `PG-CG-${new Date().getFullYear()}-MOCK-${Math.floor(1000 + Math.random() * 9000)}`;
    console.log(`[CPGRAMS-BRIDGE] (TEST MODE) Mocked Grievance Filed: ${mockId}`);
    return mockId;
  }

  // Real API Call (Protected by TEST_MODE)
  try {
    const response = await fetch(`${CPGRAMS_API_BASE}/grievance/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        // 'X-API-KEY': API_KEY // Some APIs use this instead
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`CPGRAMS API responded with status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`[CPGRAMS-BRIDGE] Grievance successfully filed: ${data.grievanceId}`);
    return data.grievanceId; 
  } catch (error) {
    console.error("[CPGRAMS-BRIDGE] Failed to file complaint:", error);
    // Even if it fails, we don't want to crash the main N.E.T.R.A database insertion.
    // Return null so the system knows it wasn't filed.
    return null;
  }
}

/**
 * Checks the status of an existing grievance on CPGRAMS.
 * @param {string} grievanceId 
 * @returns {Promise<string|null>} - "Resolved", "In Progress", or null if unchanged/error
 */
async function getGrievanceStatus(grievanceId) {
  if (TEST_MODE) {
    // In test mode, randomly "resolve" older mock tickets to simulate sync
    if (grievanceId.includes("MOCK") && Math.random() > 0.7) {
      console.log(`[CPGRAMS-BRIDGE] (TEST MODE) Mock grievance ${grievanceId} marked as RESOLVED.`);
      return "Resolved";
    }
    return "In Progress";
  }

  try {
    const response = await fetch(`${CPGRAMS_API_BASE}/grievance/status/${grievanceId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
      }
    });

    if (!response.ok) return null;

    const data = await response.json();
    // Assuming the API returns a 'status' field.
    if (data.status === "Closed" || data.status === "Resolved") {
        return "Resolved";
    }
    return "In Progress";

  } catch (error) {
    console.error(`[CPGRAMS-BRIDGE] Failed to check status for ${grievanceId}:`, error);
    return null;
  }
}

module.exports = {
  fileComplaint,
  getGrievanceStatus
};
