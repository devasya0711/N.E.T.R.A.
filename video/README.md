# N.E.T.R.A. System Architecture & Features (Deep Dive)
> **Networked Edge Tracking for Road Anomalies**

This document provides a highly detailed, technical, and operational breakdown of every core module and feature available within the N.E.T.R.A. platform.

---

## 1. Deep Learning AI Dashcam Pipeline (`/dashboard/dashcam`)
At the core of N.E.T.R.A. is its ability to ingest unstructured visual data and output structured, actionable road hazard intelligence.

### **Features:**
- **Multi-Format Ingestion Strategy:**
  - Administrators can drag-and-drop both **Video** (MP4, MOV at 30/60fps) and **Static Images** (JPG, PNG) from fleet dashcams, drones, or citizen smartphones.
- **YOLO Deep Learning Inference Engine:**
  - The system utilizes a fine-tuned YOLO (You Only Look Once) architecture to detect four classes of anomalies: **Potholes, Severe Cracking, Rutting, and Water Logging (Puddles)**.
  - The model performs frame-by-frame analysis on uploaded video, isolating specific frames where bounding box confidence targets exceed 70%.
- **Automated Severity Scoring:**
  - Not all potholes are equal. Once an anomaly is detected, a secondary computer-vision pipeline attempts to calculate a **Volume/Depth Map** using edge contrast and shadow analysis. 
  - This assigns a Severity Score (e.g., Level 1 Minor vs. Level 3 Critical Hazard).
- **PDF Report Generation:**
  - The entire analysis is bundled into a lightweight, downloadable PDF containing timestamped screenshots, severity indices, and detection logs—perfect for directly attaching to contractor work orders.

---

## 2. Predictive Early-Warning Engine (`/dashboard/predictive-engine`) [USP]
The "Killer App" that elevates N.E.T.R.A. from a *reactive* repair tool to a *proactive* asset management system.

### **Features:**
- **Live Meteorological Vulnerability Index:**
  - The platform integrates directly with the **OpenWeatherMap API** to pull live, 30-day forecasted weather data for high-risk corridors (e.g., Raipur, Bilaspur, Durg).
  - The algorithm correlates predicted **Heavy Rainfall** and extreme **Surface Temperature Swings** against *existing* minor cracks in the database.
- **Auto-Alert Forecasting:**
  - Calculates a "Degradation Risk %" over a 7-30 day window.
  - E.g., If Highway NH-130 has known micro-cracking and a 80% heavy storm forecast, N.E.T.R.A. auto-generates a preventative work order *before* the road fully washes out into a severe pothole.
- **Predictive ROI Metrics:**
  - Calculates hypothetical savings achieved by dispatching proactive gap-sealing teams today versus dispatching emergency asphalt reconstruction teams in 14 days.

---

## 3. Persistent AI Copilot (Google Gemini Integration)
A powerful, conversational interface embedded globally across the entire admin shell.

### **Features:**
- **Gemini 2.5 Flash LLM Engine:**
  - Utilizes Google's fastest reasoning model (with fallback chaining to `gemini-2.5-flash-lite` and `gemini-2.0-flash` ensuring 99.9% uptime despite quota limits).
- **System-Aware Prompting:**
  - The bot isn't just a generic ChatGPT instance; it is explicitly initialized with a massive system prompt containing N.E.T.R.A.'s architectural rules, SLA protocols, and navigation links.
- **UI/UX Implementation:**
  - Activated via a pulsing, gradient floating-action button in the bottom right corner.
  - Features real-time typing indicators, auto-scrolling chat history, and gracefully handles network/quota errors without breaking the page.

---

## 4. Geospatial Intelligence & Tracking (`/dashboard/livemap`)
Visualizing the scale of infrastructure damage across the state map.

### **Features:**
- **Interactive MapTiler Integration:**
  - Built using `react-leaflet` layered over premium MapTiler custom dark tiles, stripping away distracting default UI elements (no generic logos) for a pure command-center aesthetic.
- **Risk Heatmaps:**
  - Instead of just displaying thousands of individual dots, the engine clusters anomalies dynamically based on zoom level.
  - The heatmap layers calculate localized density, visually changing from green (safe) to yellow (moderate) to deep red (high-density anomaly zones), allowing state officials to justify localized budget deployments visually.

---

## 5. Triage, Reporting, & Closed-Loop Resolution (`/dashboard/resolution`)
N.E.T.R.A. handles the entire lifecycle of a pothole from the moment a citizen reports it to the moment the contractor's payment clears.

### **Features:**
- **Citizen Report Queue / Complaint Tracker:**
  - A dedicated portal designed to mimic and improve upon platforms like CPGRAMS. Citizens upload geolocated photos and descriptions.
  - The AI instantly validates the image (blocking spam) and inserts it into the Admin Queue.
- **Automated Severity Triage & SLAs (Service Level Agreements):**
  - **Level 3 (Severe):** Auto-escalated. Demands repair within 48-72 hours.
  - **Level 1 (Minor):** Batched for routine 30-day maintenance schedules.
- **Assigned Work Orders:**
  - A dispatch view for regional contractors.
- **The Closed-Loop Audit (Resolution Tracking):**
  - Most systems close a ticket when the contractor says "I fixed it." N.E.T.R.A. requires the contractor to upload a post-repair photo/video.
  - The AI re-scans the footage. Only if the AI confirms the absence of an anomaly does the ticket move from "Filed/Escalated" into **"Verified Repaired."**
  - This is visualized on a massive interactive bar chart that compares open complaints against mathematically verified repairs.

---

## 6. Access Control & Security
- **Clerk Authentication:**
  - Enterprise-grade zero-trust identity management.
  - **Role-Based Access Control (RBAC):** Strict segregation routing citizens to `/report` pages while locking the `/dashboard` Analytics shell exclusively to users authenticated with specific domains (e.g., `@iiitnr.edu.in`).

---
> *Generated by N.E.T.R.A. Intelligence Team.*
