import os
import json
import requests
import time

API_URL = os.getenv("API_URL", "http://localhost:5000/api/potholes")

def sync_potholes(json_path="output/unique_potholes.json"):
    print(f"Syncing {json_path} to {API_URL} ...")
    if not os.path.exists(json_path):
        print(f"File not found: {json_path}")
        return

    with open(json_path, "r") as f:
        data = json.load(f)

    success_count = 0
    for record in data:
        # Map AI output to MongoDB schema
        pothole_id = record.get("pothole_id", f"NETRA-{int(time.time()*1000)}")
        
        gps = record.get("gps", {})
        lat = gps.get("latitude", 0)
        lng = gps.get("longitude", 0)

        severity_data = record.get("severity", {})
        raw_score = severity_data.get("score", 0.1) # 0 to 1
        
        # Scale to 1-10
        severity_score = max(1.0, min(10.0, raw_score * 10))
        # Scale to 0-100
        danger_index = max(0, min(100, int(raw_score * 100)))

        depth_data = record.get("depth", {})
        
        # Calculate approximate real world values from relative values if needed 
        # (Assuming relative depth * ~30cm max depth as a placeholder, can be tuned)
        depth_cm = depth_data.get("max_depth_rel", 0) * 30
        diameter_cm = depth_data.get("diameter_px", 0) * 0.25 # arbitrary scaling if true cm not available

        payload = {
            "potholeId": pothole_id,
            "location": {
                "type": "Point",
                "coordinates": [lng, lat]
            },
            "highwayName": "Unknown Highway",
            "streetName": "Unknown Street",
            "locationDescription": "Detected by Pipeline",
            "severityScore": round(severity_score, 1),
            "dangerIndex": danger_index,
            "depthCm": round(depth_cm, 1),
            "diameterCm": round(diameter_cm, 1),
            "detectionSource": "Transit-Dashcam",
            "confidence": record.get("detection", {}).get("confidence", 0),
            "status": "Submitted"
        }

        try:
            resp = requests.post(API_URL, json=payload)
            if resp.status_code in [200, 201]:
                print(f"[✓] Synced {pothole_id}")
                success_count += 1
            else:
                print(f"[✗] Failed to sync {pothole_id}: {resp.status_code} - {resp.text}")
        except Exception as e:
            print(f"[✗] Error sending {pothole_id}: {e}")

    print(f"Successfully synced {success_count}/{len(data)} records.")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", default="output/unique_potholes.json", help="Path to JSON to sync")
    args = parser.parse_args()
    sync_potholes(args.file)
