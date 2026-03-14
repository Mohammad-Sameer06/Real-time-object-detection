"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";

interface Detection {
  box: [number, number, number, number];
  confidence: number;
  class: string;
}

const WS_URL = "ws://localhost:8000/ws";
const FRAME_INTERVAL_MS = 100;
const JPEG_QUALITY = 0.65;

export default function ObjectDetector() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const canvasHiddenRef = useRef<HTMLCanvasElement | null>(null);
  const lastTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const frameSentAtRef = useRef<number>(0);

  const [isActive, setIsActive] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [wsStatus, setWsStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [stats, setStats] = useState({ fps: 0, objects: 0, latency: 0 });
  const [detections, setDetections] = useState<Detection[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) return;

    setWsStatus("connecting");
    setErrorMsg(null);
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      wsRef.current = ws;
      setWsStatus("connected");
    };

    ws.onmessage = (event) => {
      const latency = Math.round(performance.now() - frameSentAtRef.current);
      const data = JSON.parse(event.data);
      setDetections(data.detections ?? []);
      setStats((prev) => ({ ...prev, objects: data.count ?? 0, latency }));
    };

    ws.onerror = () => {
      setWsStatus("error");
      setErrorMsg("Cannot reach detection server. Is the backend running on port 8000?");
    };

    ws.onclose = () => {
      wsRef.current = null;
      setWsStatus("idle");
    };
  }, []);

  const startCamera = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
    });
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await new Promise<void>((resolve) => {
        videoRef.current!.onloadedmetadata = () => {
          videoRef.current!.play();
          resolve();
        };
      });
      setIsCameraReady(true);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraReady(false);
  }, []);

  const handleToggle = async () => {
    if (isActive) {
      wsRef.current?.close();
      stopCamera();
      setIsActive(false);
      setDetections([]);
      setStats({ fps: 0, objects: 0, latency: 0 });
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    } else {
      setErrorMsg(null);
      try {
        await startCamera();
        connectWebSocket();
        setIsActive(true);
      } catch {
        setErrorMsg("Camera access denied. Please allow camera permissions and try again.");
      }
    }
  };

  // Frame capture loop
  useEffect(() => {
    if (!isActive || !isCameraReady) return;
    const interval = setInterval(() => {
      const ws = wsRef.current;
      if (ws?.readyState !== WebSocket.OPEN || !videoRef.current) return;

      if (!canvasHiddenRef.current) {
        canvasHiddenRef.current = document.createElement("canvas");
      }
      const c = canvasHiddenRef.current;
      c.width = videoRef.current.videoWidth;
      c.height = videoRef.current.videoHeight;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(videoRef.current, 0, 0);
      frameSentAtRef.current = performance.now();
      ws.send(c.toDataURL("image/jpeg", JPEG_QUALITY));

      // FPS counter
      frameCountRef.current++;
      const now = performance.now();
      if (now - lastTimeRef.current >= 1000) {
        setStats((prev) => ({ ...prev, fps: frameCountRef.current }));
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }
    }, FRAME_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isActive, isCameraReady]);

  // Draw detections on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.clientWidth;
    canvas.height = video.clientHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!detections.length || !video.videoWidth) return;

    const sx = canvas.width / video.videoWidth;
    const sy = canvas.height / video.videoHeight;

    detections.forEach((det) => {
      const [x1, y1, x2, y2] = det.box;
      const x = x1 * sx;
      const y = y1 * sy;
      const w = (x2 - x1) * sx;
      const h = (y2 - y1) * sy;
      const conf = Math.round(det.confidence * 100);

      // Bounding box
      ctx.strokeStyle = "rgba(99, 102, 241, 0.9)";
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.strokeRect(x, y, w, h);

      // Corner accents
      const cornerLen = Math.min(16, w / 4, h / 4);
      ctx.strokeStyle = "#818cf8";
      ctx.lineWidth = 3;
      // top-left
      ctx.beginPath(); ctx.moveTo(x, y + cornerLen); ctx.lineTo(x, y); ctx.lineTo(x + cornerLen, y); ctx.stroke();
      // top-right
      ctx.beginPath(); ctx.moveTo(x + w - cornerLen, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + cornerLen); ctx.stroke();
      // bottom-left
      ctx.beginPath(); ctx.moveTo(x, y + h - cornerLen); ctx.lineTo(x, y + h); ctx.lineTo(x + cornerLen, y + h); ctx.stroke();
      // bottom-right
      ctx.beginPath(); ctx.moveTo(x + w - cornerLen, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - cornerLen); ctx.stroke();

      // Label
      const label = `${det.class} ${conf}%`;
      ctx.font = "600 13px 'Geist Mono', ui-monospace, monospace";
      const tw = ctx.measureText(label).width;
      const pad = 6;
      const lh = 22;
      const lx = x;
      const ly = y - lh - 4;

      ctx.fillStyle = "rgba(99, 102, 241, 0.85)";
      ctx.beginPath();
      ctx.roundRect(lx, ly, tw + pad * 2, lh, 4);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.fillText(label, lx + pad, ly + 15);
    });
  }, [detections]);

  const statusColor = wsStatus === "connected" ? "bg-emerald-500" : wsStatus === "connecting" ? "bg-amber-400" : wsStatus === "error" ? "bg-red-500" : "bg-zinc-600";
  const statusLabel = wsStatus === "connected" ? "Connected" : wsStatus === "connecting" ? "Connecting…" : wsStatus === "error" ? "Error" : "Offline";

  return (
    <section className="w-full max-w-5xl mx-auto">
      {/* Error banner */}
      {errorMsg && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="ml-auto text-red-400/60 hover:text-red-300">✕</button>
        </div>
      )}

      {/* Video viewport */}
      <div className="relative rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800/60 shadow-2xl">
        <div className="aspect-video relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
              isCameraReady ? "opacity-100" : "opacity-0"
            }`}
          />
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-10" />

          {/* Idle state */}
          {!isActive && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-950">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-5">
                <svg className="w-7 h-7 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
              </div>
              <p className="text-zinc-500 text-sm mb-1">Camera is off</p>
              <p className="text-zinc-600 text-xs">Click Start Detection below to begin</p>
            </div>
          )}

          {/* Loading state — camera active but WS not connected yet */}
          {isActive && !isCameraReady && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-950">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Bottom bar (inside the video container) */}
        <div className="relative z-20 flex items-center justify-between px-5 py-3 bg-zinc-950/80 backdrop-blur-md border-t border-zinc-800/60">
          <div className="flex items-center gap-5">
            <button
              onClick={handleToggle}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                isActive
                  ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30"
                  : "bg-indigo-600 text-white hover:bg-indigo-500 border border-indigo-500"
              }`}
            >
              {isActive ? "Stop Detection" : "Start Detection"}
            </button>

            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${statusColor} ${wsStatus === "connecting" ? "animate-pulse" : ""}`} />
              <span className="text-xs text-zinc-400 font-medium">{statusLabel}</span>
            </div>
          </div>

          {isActive && (
            <div className="flex items-center gap-6 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-zinc-500">FPS</span>
                <span className="text-zinc-200 font-semibold tabular-nums">{stats.fps}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-zinc-500">Latency</span>
                <span className="text-zinc-200 font-semibold tabular-nums">{stats.latency}ms</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-zinc-500">Objects</span>
                <span className="text-indigo-400 font-semibold tabular-nums">{stats.objects}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detection list */}
      {isActive && detections.length > 0 && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {detections.map((det, i) => (
            <div
              key={`${det.class}-${i}`}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-zinc-900/70 border border-zinc-800/60"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
              <span className="text-xs text-zinc-300 font-medium truncate">{det.class}</span>
              <span className="text-xs text-zinc-500 font-mono ml-auto">{Math.round(det.confidence * 100)}%</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
