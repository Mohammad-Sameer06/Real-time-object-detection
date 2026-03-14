import cv2
import numpy as np
import base64
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global Model Configuration
# Available: yolo26n.pt (nano), yolo26s.pt (small), yolo26m.pt (medium)
MODEL_NAME = "yolo26s.pt" # Upgraded to 'small' for better accuracy

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development, allow all
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model
try:
    model = YOLO(MODEL_NAME)
    logger.info(f"YOLO engine initialized with {MODEL_NAME}")
except Exception as e:
    logger.error(f"Error loading model {MODEL_NAME}: {e}")
    model = YOLO("yolo11n.pt") 
    logger.info("Fallback to YOLO11n engine.")

@app.get("/")
async def root():
    return {"message": "Real-Time Object Detection API (YOLO26)"}

@app.get("/health")
async def health():
    return {"status": "ok", "model": MODEL_NAME}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket connection established.")
    try:
        while True:
            # Receive image data (base64) from client
            data = await websocket.receive_text()
            
            # Remove header if present (data:image/jpeg;base64,...)
            if "," in data:
                data = data.split(",")[1]
            elif data.startswith("data:"):
                 # This shouldn't happen with .split(","), but just in case
                 logger.warning("Received data with header but no comma separator")
                 continue
            
            # Decode base64 to image
            try:
                img_bytes = base64.b64decode(data)
                nparr = np.frombuffer(img_bytes, np.uint8)
                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                
                if img is None or img.size == 0:
                    logger.warning("Failed to decode image from base64")
                    continue

                # Run YOLO inference
                # stream=True for better performance in loops
                results = model(img, verbose=False)
                
                # Extract detection data
                detections = []
                for result in results:
                    boxes = result.boxes
                    for box in boxes:
                        # Get coordinates, confidence, and class
                        x1, y1, x2, y2 = box.xyxy[0].tolist()
                        conf = float(box.conf[0])
                        cls = int(box.cls[0])
                        name = result.names[cls]
                        
                        detections.append({
                            "box": [x1, y1, x2, y2],
                            "confidence": conf,
                            "class": name
                        })

                # Send results back to client
                await websocket.send_text(json.dumps({
                    "detections": detections,
                    "count": len(detections)
                }))
                
            except Exception as e:
                logger.error(f"Error processing frame: {e}")
                continue

    except WebSocketDisconnect:
        logger.info("WebSocket connection closed.")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        await websocket.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
