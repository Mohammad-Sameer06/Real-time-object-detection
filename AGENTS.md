# README.md

This file provides guidance to WARP when working with code in this repository.

## Project Overview

Real-time object detection web app with a Python/FastAPI backend running YOLO inference and a Next.js frontend that streams webcam frames over WebSocket and renders detection overlays on a canvas.

## Architecture

**Backend** (`backend/`): FastAPI server with a single WebSocket endpoint (`/ws`). The frontend sends base64-encoded JPEG frames; the backend decodes them with OpenCV, runs YOLO inference via the `ultralytics` library, and returns JSON detection results (bounding boxes, confidence, class name). The model defaults to `yolo26s.pt` (small) with a fallback to `yolo11n.pt`.

**Frontend** (`frontend/`): Next.js 16 App Router with React 19, Tailwind CSS v4, and TypeScript. The entire detection UI lives in a single client component `src/components/ObjectDetector.tsx`, which manages camera access, WebSocket lifecycle, frame capture at ~10 FPS via `setInterval(100ms)`, and drawing bounding boxes on an overlay `<canvas>`. The page (`src/app/page.tsx`) is a thin wrapper. Styling uses a cyberpunk/neon theme defined in `globals.css` with custom CSS classes (`cyber-panel`, `cyber-button`, `neon-text`, etc.).

**Communication**: Frontend captures a video frame → converts to base64 JPEG → sends over WebSocket → backend returns `{ detections: [...], count: N }` → frontend draws boxes on canvas overlay.

**Model files** (`.pt`): YOLO weight files exist in both the repo root and `backend/`. The backend loads from its own directory.

## Commands

### Backend
```
# Activate the Python virtual environment
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r backend\requirements.txt

# Run the backend server (serves on http://localhost:8000)
uvicorn backend.main:app --reload

# Or run directly
python backend\main.py

# Train a custom model (requires a data.yaml and dataset)
python backend\train.py
```

### Frontend
```
# Install dependencies
cd frontend && npm install

# Dev server (http://localhost:3000)
npm run dev

# Production build
npm run build

# Lint
npm run lint
```

### Running the full app
Start the backend first (`uvicorn backend.main:app --reload`), then the frontend (`npm run dev` from `frontend/`). The frontend connects to `ws://localhost:8000/ws`.

## Key Constraints

- The WebSocket URL is hardcoded to `ws://localhost:8000/ws` in `ObjectDetector.tsx` (line 45). Any backend port change must be reflected there.
- CORS is wide open (`allow_origins=["*"]`) in the backend — this is development-only configuration.
- The Python venv is at `.venv` and the VS Code settings point to it (`.vscode/settings.json`).
- React Compiler is enabled in `next.config.ts` (`reactCompiler: true`).
- No test framework is currently configured for either backend or frontend.
