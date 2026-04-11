<div align="center">

  <h1>N.E.T.R.A. System 🛰️</h1>
  <p><strong>Networked Edge Tracking for Road Anomalies</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Status-Active-success.svg" alt="Status">
    <img src="https://img.shields.io/badge/Frontend-Vite%20%7C%20React-blue.svg" alt="Frontend">
    <img src="https://img.shields.io/badge/Backend-Node.js%20%7C%20FastAPI-green.svg" alt="Backend">
    <img src="https://img.shields.io/badge/AI-Ultralytics%20YOLOv8%20%7C%20PyTorch-orange.svg" alt="AI">
  </p>

  <p>
    An intelligent, autonomous platform for real-time pothole detection, risk assessment, and automated grievance filing — designed for scalable civic infrastructure maintenance.
  </p>
</div>

---

## 🌟 Overview

**N.E.T.R.A.** (Networked Edge Tracking for Road Anomalies) is an advanced infrastructure safety platform. Leveraging state-of-the-art computer vision models, it automatically detects road anomalies from dashcam or standard video feeds, calculates severity scores, and autonomously relays structured grievance data to civic agencies (e.g., CPGRAMS / NHAI).

By eliminating manual auditing, N.E.T.R.A. drastically reduces response times to hazardous road conditions and provides municipalities with a real-time, geospatial heatmap of infrastructure decay.

---

## ✨ Core Capabilities

- 🛣️ **Real-Time Anomaly Detection:** Processes video streams instantly using highly optimized PyTorch integration with Ultralytics YOLOv8.
- 📐 **Depth & Severity Estimation:** Assesses pothole depth, diameter, and critical risk factors to calculate a normalized severity score.
- 🤖 **Autonomous Workflows:** Automatically routes high-severity road hazards as official grievance tickets without human intervention.
- 🗺️ **Dynamic Geospatial Intelligence:** Live-updating dashboards equipped with interactive mapping (Leaflet.js) to cluster and visualize infrastructure damage.
- ⚡ **Microservices Architecture:** Independently scalable components tailored for edge, local, or full cloud deployments.

---

## 🏗️ System Architecture

N.E.T.R.A. follows a decoupled microservices design standard:

| Component | Stack | Responsibility |
| :--- | :--- | :--- |
| **`netra-web`** | React 18, Vite, Tailwind CSS, Shadcn/UI | The management dashboard. Secure Auth via Clerk. Visual data tracking and interactive map views. |
| **`netra-api`** | Node.js, Express.js, MongoDB Atlas   | Central nervous system. Handles data persistence, user management, and proxies to the AI service. |
| **`NETRA-AI`**  | Python 3.10+, FastAPI, PyTorch        | Deep learning inference engine. Processes video, generates bounding boxes, and calculates severity. |

---

## 🛠️ Quick Start Guide

### Prerequisites
- Node.js (v18.x or higher)
- Python (v3.10 or higher)
- MongoDB Atlas cluster URI
- Docker & Docker Compose *(Optional, for containerized deployment)*

### 1. Unified Setup via Docker (Recommended)

To spin up the entire application environment instantly:

```bash
# Clone the repository
git clone https://github.com/organization/NETRA.git
cd NETRA

# Fire up all services (Web, API, AI Engine)
docker-compose up --build
```
> Ensure your `.env` variables in `netra-api/.env` and `netra-web/.env` are correctly seeded before running `docker-compose`.

### 2. Manual Development Setup

#### `netra-api` (Backend)
```bash
cd netra-api
npm install
# Configure your .env file here
npm run dev
```

#### `NETRA-AI` (AI Core)
```bash
cd NETRA-AI
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Start the FastAPI engine
uvicorn ai_service:app --host 0.0.0.0 --port 8000 --reload
```

#### `netra-web` (Frontend)
```bash
cd netra-web
npm install
# Configure your .env file here (Client IDs, API URLs)
npm run dev
```

---

## ☁️ Deployment (Render / Cloud Platforms)

For production deployments where microservices run as isolated containers, verify your cross-container environment configurations. 

Specifically, inject these Environment Variables into your deployments:

1. **`netra-api` Container**: 
   - `AI_SERVICE_URL="https://your-netra-ai.onrender.com"`
   - `PUBLIC_API_ORIGIN="https://your-netra-api.onrender.com"` *(Critical for AI DB syncing)*
   - `MONGO_URI="..."`
2. **`NETRA-AI` Container**:
   - `INTERNAL_API_URL="https://your-netra-api.onrender.com/api/potholes"`

---

## 🔒 License & Usage Note
Developed as a proprietary toolset for civic and government implementations (e.g., CHiPS / NHAI). Unauthorized replication or distribution outside permitted boundaries is prohibited.
