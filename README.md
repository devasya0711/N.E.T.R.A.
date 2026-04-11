<div align="center">

# N.E.T.R.A.

### **Networked Edge Tracking for Road Anomalies**

<br/>

![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js_20-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![PyTorch](https://img.shields.io/badge/PyTorch-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB_Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![YOLOv8](https://img.shields.io/badge/YOLOv8-FF6F00?style=for-the-badge&logo=ultralytics&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Render](https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)

<br/>

*An AI-powered autonomous system that detects road potholes in real-time using YOLOv8 computer vision, estimates their severity through depth analysis, and automatically files grievances with government authorities — eliminating the need for manual road inspections.*

<br/>

**Developed for CHiPS · NHAI (National Highways Authority of India)**

<br/>

[Live Frontend (Vercel)](https://netra-9f3ai58s8-code-flex.vercel.app/) · [Backend API (Render)](https://netra-api-w3td.onrender.com/) · [AI Service (Render)](https://netra-ai-zzls.onrender.com/)

<br/>

*Note: The backend and AI services on Render may take 30-50 seconds to wake up from a cold start if inactive.*

</div>

---

## Project Overview

India has over **6.4 million km** of roads, and pothole-related accidents claim **thousands of lives annually**. Current detection methods rely on manual inspections and citizen complaints — both reactive, slow, and inconsistent.

**N.E.T.R.A.** solves this by creating a fully autonomous pipeline:

> **Upload dashcam footage → AI detects & segments potholes → Estimates depth & severity → Pins on live map → Auto-files government grievance**

No human in the loop. No complaint lost. No delay.

---

## Problem It Solves

| Problem | N.E.T.R.A. Solution |
|:---|:---|
| Manual road inspections are **slow and costly** | Automated AI detection from video/image uploads |
| Citizens report potholes but complaints get **lost in bureaucracy** | Direct integration with **CPGRAMS** for automated grievance filing |
| No **centralized database** of road damage | Real-time geospatial database with live heatmaps |
| Severity assessment is **subjective** | AI-driven scoring using depth estimation (MiDaS) and dimensional analysis |
| **No accountability** — repairs aren't tracked | SLA tracking with auto-escalation when deadlines are breached |

### Target Users
- **NHAI / PWD Engineers** — Prioritize repairs by severity heatmaps
- **Government Officials** — Track SLA compliance and resolution rates
- **Transit Authorities** — Monitor fleet routes for road hazards
- **Citizens** — Report road damage through the public portal

---

## Features

### AI & Detection
- **YOLOv8 Instance Segmentation** — Real-time pothole detection with bounding-box and mask outputs
- **MiDaS Depth Estimation** — Calculates relative depth of each detected anomaly
- **Severity Scoring Engine** — Normalizes depth, diameter, and confidence into a 1–10 risk score
- **Batch & Real-Time Processing** — Works on single images, video files, and live dashcam streams

### Command Center Dashboard
- **Live Geospatial Map** — Interactive Leaflet.js map with clustered pothole markers
- **Risk Heatmaps** — Kernel-density heatmaps highlighting high-danger road segments
- **Analytics Dashboard** — Recharts-powered graphs showing detection trends, severity distribution, and SLA compliance
- **YOLO Detection Queue** — Upload queue with real-time processing logs and frame-by-frame progress

### Incident Management
- **Severity Triage** — Auto-classifies potholes into priority tiers (Critical / High / Medium / Low)
- **Work Order Assignment** — Assign repair jobs to field officers with deadline tracking
- **SLA Monitoring** — 7-day default SLA with automatic escalation on breach
- **CPGRAMS Integration** — Files grievances directly to India's centralized public grievance portal

### Access & Security
- **Clerk Authentication** — Secure role-based login (Admin, Engineer, Citizen)
- **Role-Based Dashboards** — Different views for admin operators vs. public citizens
- **PDF Report Generation** — Export detection reports with jsPDF for administrative records

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         N.E.T.R.A. PLATFORM                            │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   ┌─────────────┐     ┌──────────────┐     ┌───────────────────┐       │
│   │  netra-web   │────▶│  netra-api   │────▶│    NETRA-AI       │       │
│   │  (Frontend)  │◀────│  (Backend)   │◀────│  (AI Service)     │       │
│   └─────────────┘     └──────┬───────┘     └───────────────────┘       │
│    React 19 + Vite      Express 5  │        FastAPI + PyTorch          │
│    Tailwind CSS         Mongoose   │        YOLOv8 + MiDaS             │
│    Clerk Auth           Multer     │        OpenCV + Supervision       │
│    Leaflet + Recharts              │                                   │
│                            ┌───────▼───────┐                           │
│                            │ MongoDB Atlas  │                           │
│                            │  (Database)    │                           │
│                            └───────────────┘                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### Tech Stack Breakdown

| Layer | Technology | Purpose |
|:---|:---|:---|
| **Frontend** | React 19, Vite 7, Tailwind CSS, Framer Motion | SPA dashboard with animations |
| **UI Components** | Lucide React, Shadcn/UI, Recharts | Icons, charts, and data visualization |
| **Authentication** | Clerk | Secure user management with role-based access |
| **Mapping** | Leaflet.js, React-Leaflet, Leaflet.heat | Geospatial visualization and heatmaps |
| **Backend** | Node.js 20, Express 5, Mongoose 9 | REST API, file handling, job orchestration |
| **Database** | MongoDB Atlas | Cloud-hosted NoSQL with 2dsphere geospatial indexes |
| **AI / ML** | Python 3.10+, PyTorch 2.0, Ultralytics YOLOv8 | Instance segmentation and object detection |
| **Depth Model** | MiDaS (Intel ISL via Torch Hub) | Monocular depth estimation |
| **CV Pipeline** | OpenCV, Supervision, NumPy | Frame processing, annotation, tracking |
| **Containerization** | Docker, Docker Compose | Multi-service orchestration |
| **Deployment** | Vercel (web), Render (API + AI) | Production hosting |

---

## AI Models & Pipeline Details

N.E.T.R.A. combines multiple deep learning models in a sequential inference pipeline:

| Model | Architecture | Task | Details |
|:---|:---|:---|:---|
| **YOLOv8x-seg** | Ultralytics YOLOv8 (Instance Segmentation) | Pothole detection & segmentation | 73 layers, 11.1M parameters, 28.4 GFLOPs. Produces bounding boxes + pixel-level masks for each detected anomaly. |
| **MiDaS v2.1 Small** | Intel ISL (via Torch Hub) | Monocular depth estimation | Estimates relative depth from a single 2D image. Used to calculate pothole depth without LIDAR hardware. Falls back to zero-depth mode if unavailable. |
| **Supervision** | Roboflow Supervision Library | Annotation & tracking | Handles bounding-box rendering, mask overlays, and multi-object tracking across video frames. |

### Severity Scoring Algorithm

Each detected pothole receives a **severity score (1–10)** computed from:

```
severity = f(relative_depth, bounding_box_area, detection_confidence)

  - relative_depth    → MiDaS depth map value within the detection mask
  - bounding_box_area → Proxy for physical diameter (scaled by frame resolution)
  - confidence        → YOLOv8 detection confidence (0.0 – 1.0)

Danger Index (0–100) = severity × 10
```

### Inference Performance

| Metric | Value |
|:---|:---|
| Model size (fused) | 73 layers, 11.1M params |
| Compute cost | 28.4 GFLOPs per frame |
| Supported input | `.jpg`, `.jpeg`, `.png`, `.bmp`, `.mp4`, `.avi`, `.mov` |
| Processing mode | Asynchronous (job queue with polling) |
| GPU support | CUDA-enabled (auto-detects); CPU fallback available |

---

## How It Works

### End-to-End Pipeline

```
Upload Image/Video
        │
        ▼
┌─────────────────┐
│  1. UPLOAD       │  Frontend sends file via multipart/form-data
│     to Backend   │  Backend validates and assigns a unique runId
└────────┬────────┘
         ▼
┌─────────────────┐
│  2. FORWARD      │  Backend forwards to NETRA-AI service
│     to AI        │  POST /jobs with file + runId + callback URL
└────────┬────────┘
         ▼
┌─────────────────┐
│  3. AI PIPELINE  │  YOLOv8 detects & segments potholes
│     (NETRA-AI)   │  MiDaS estimates depth per detection
│                  │  Severity score calculated (1-10)
│                  │  GPS extracted from EXIF / file metadata
└────────┬────────┘
         ▼
┌─────────────────┐
│  4. SYNC TO DB   │  AI service POSTs each detected pothole
│                  │  to Backend API → saved in MongoDB Atlas
└────────┬────────┘
         ▼
┌─────────────────┐
│  5. RESULT       │  Frontend polls GET /analysis-result/:runId
│     DELIVERY     │  Receives annotated image + detection data
│                  │  Dashboard updates with new markers
└────────┬────────┘
         ▼
┌─────────────────┐
│  6. AUTO-ACTION  │  High-severity → auto-files CPGRAMS grievance
│                  │  SLA clock starts (default: 7 days)
│                  │  Work order created for field team
└─────────────────┘
```

---

## Installation & Setup

### Prerequisites

```
Node.js      ≥ 18.x
Python       ≥ 3.10
MongoDB      Atlas cluster (or local)
Docker       (optional, for containerized setup)
```

### Option 1: Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/devasya0711/N.E.T.R.A..git
cd N.E.T.R.A.

# Configure environment variables
cp netra-api/.env.example netra-api/.env
# Edit netra-api/.env with your MONGO_URI, API keys, etc.

# Launch all three services
docker-compose up --build
```

Services will be available at:
| Service | URL |
|:---|:---|
| Frontend | `http://localhost:5173` |
| Backend API | `http://localhost:5000` |
| AI Service | `http://localhost:8000` |

### Option 2: Manual Setup (Development)

#### Backend API

```bash
cd netra-api
npm install

# Create and configure .env
cp .env.example .env
# Set: MONGO_URI, PORT, ALLOWED_ORIGINS

npm run dev
# ✓ Server running on http://localhost:5000
```

#### AI Inference Service

```bash
cd NETRA-AI
python3 -m venv .venv
source .venv/bin/activate   # macOS/Linux
# .venv\Scripts\activate    # Windows

pip install -r requirements.txt
pip install fastapi uvicorn python-multipart

uvicorn ai_service:app --host 0.0.0.0 --port 8000 --reload
# ✓ AI service running on http://localhost:8000
```

#### Frontend Dashboard

```bash
cd netra-web
npm install

# Create .env with your Clerk keys and API URL
# VITE_CLERK_PUBLISHABLE_KEY=pk_...
# VITE_API_URL=http://localhost:5000/api/potholes

npm run dev
# ✓ Dashboard running on http://localhost:5173
```

---

## Usage

### For Administrators
1. **Login** via Clerk authentication on the landing page
2. Navigate to **AI Analysis** in the sidebar
3. **Upload** a dashcam image or video file
4. Watch the real-time **processing logs** as YOLOv8 analyzes frames
5. View detected potholes on the **Live Map** with severity markers
6. Check **Severity Triage** for prioritized repair recommendations
7. Monitor **Work Orders** and **SLA Tracking** for active repairs

### For Citizens
1. Access the **Citizen Portal** from the landing page
2. **Submit a report** with photo and location
3. **Track complaint status** via the Complaint Tracker
4. Receive updates as repairs progress

### API Endpoints

```
POST   /api/potholes                    Create a pothole record
GET    /api/potholes                    List all potholes (with filters)
GET    /api/potholes/:id                Get pothole by ID
PUT    /api/potholes/:id                Update pothole record
POST   /api/potholes/analyze-video      Upload & analyze media via AI
GET    /api/potholes/analysis-result/:id Poll analysis job status
GET    /api/potholes/ai-health          Check AI service connectivity
```

---

## Future Improvements

- [ ] **Edge Deployment** — Run YOLOv8 on Jetson Nano/Orin for real-time in-vehicle detection
- [ ] **Live Dashcam Streaming** — WebRTC integration for continuous highway monitoring
- [ ] **Predictive Road Decay** — Time-series ML model to predict pothole formation before it happens
- [ ] **Multi-Language Support** — Hindi, Tamil, and regional language dashboards
- [ ] **Mobile App** — React Native companion app for field officers
- [ ] **Satellite Imagery Analysis** — Large-scale highway scanning via satellite feeds
- [ ] **Blockchain Audit Trail** — Immutable grievance & resolution records for transparency

---

## Challenges Faced

| Challenge | How We Solved It |
|:---|:---|
| **Cross-container networking on Render** | AI service and backend run as separate Render containers — configured `PUBLIC_API_ORIGIN` so the AI service can reach the backend to sync results to MongoDB |
| **Render cold starts (30s+ delay)** | Implemented retry logic with 5s delay and increased timeouts to 60s+ for the initial AI service request |
| **MiDaS model download failures** | Added Torch Hub caching (`TORCH_HOME`) and graceful fallback to zero-depth estimation when MiDaS is unavailable |
| **Real-time progress tracking** | Built a `live_meta.json` polling system that streams frame-by-frame progress from the AI container to the frontend |
| **Large video file uploads** | Chunked uploads via Multer with progress tracking via XMLHttpRequest `upload.onprogress` events |
| **GeoJSON coordinate ordering** | MongoDB uses `[lng, lat]` — added schema-level validators to prevent the common lat/lng swap mistake |

---

## What I Learned

- **Full-Stack Microservices Architecture** — Designing, building, and deploying a 3-service system with independent scaling
- **Computer Vision Pipelines** — Integrating YOLOv8 for instance segmentation with custom post-processing for severity analysis
- **Monocular Depth Estimation** — Using MiDaS to extract relative depth from 2D images without LIDAR
- **Asynchronous Job Processing** — Building reliable async job queues with polling, retries, and timeout handling
- **Cloud Deployment & Networking** — Deploying to Render/Vercel with cross-origin configuration, environment management, and Docker orchestration
- **Geospatial Data Engineering** — MongoDB 2dsphere indexes, GeoJSON standards, and heatmap visualization with Leaflet.js
- **Production Error Handling** — Structured logging, graceful degradation, exponential backoff, and cold-start resilience

---

## Contributing

Contributions are welcome! Here's how to get started:

```bash
# 1. Fork the repository
# 2. Create a feature branch
git checkout -b feature/your-feature-name

# 3. Make your changes and commit
git commit -m "feat: add your feature description"

# 4. Push to your fork
git push origin feature/your-feature-name

# 5. Open a Pull Request
```

### Contribution Guidelines
- Follow existing code style and project structure
- Write descriptive commit messages using [Conventional Commits](https://www.conventionalcommits.org/)
- Test your changes locally before submitting a PR
- Update documentation if you add new features

---

## License

This project is built for civic and government implementation (CHiPS / NHAI).  
All rights reserved. Unauthorized distribution outside permitted use is prohibited.

---

<div align="center">

**Built with AI for safer Indian roads**

*N.E.T.R.A. — Because every pothole matters.*

</div>
