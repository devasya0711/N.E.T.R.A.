# Hackathon Submission Details: N.E.T.R.A.

**Project Name:** N.E.T.R.A. (Networked Edge Tracking for Road Anomalies)

## 📌 Brief Project Description
N.E.T.R.A. is an AI-powered, closed-loop command center designed to revolutionize road infrastructure management. It transitions municipal defect tracking from a purely **reactive** process (finding potholes after accidents occur) into a **proactive** ecosystem. 

By analyzing dashcam and smartphone footage through a custom Deep Learning Vision pipeline, N.E.T.R.A. automatically maps, scores, and triages road anomalies (potholes, severe cracking, rutting). Its major Unique Selling Proposition (USP) is a **Predictive Early-Warning Engine** that correlates historical severity data with live meteorological APIs (rainfall/temperature forecasts) to predict infrastructure failure 7-30 days *before* it happens. Furthermore, N.E.T.R.A. enforces total accountability via Automated SLA Tracking, requiring post-repair visual verification by the AI before contractors can mark a ticket as resolved.

## 🛠️ Tech Stack Used

### **Frontend & UI/UX**
*   **Framework:** React (+ Vite)
*   **Styling & Components:** Tailwind CSS (Premium Glassmorphism Design System), Headless UI, Framer Motion (micro-animations)
*   **Data Visualization:** Recharts, React-Leaflet (Geospatial Mapping with MapTiler Custom Dark Layers)

### **Backend & APIs**
*   **Framework:** Node.js + Express.js
*   **Database Integration:** Document/Relational (depending on deployment target)
*   **Authentication & Security:** Clerk (Enterprise-grade Zero-Trust Role-Based Access Control)
*   **External APIs:**
    *   **Google Gemini 2.5 Flash:** Powers a persistent, context-aware AI Assistant copilot embedded globally in the dashboard UI.
    *   **OpenWeatherMap API:** Powers the live Meteorological Vulnerability Index for the Predictive Engine.

### **AI & Computer Vision Layer**
*   **Object Detection:** YOLO (You Only Look Once) architecture customized for high-speed anomaly detection.
*   **Computer Vision Pipeline:** OpenCV for depth/shadow estimation and severity scoring from raw video frames.

### **Deployment & Tooling**
*   **Version Control:** Git & GitHub
*   **Package Management:** npm
