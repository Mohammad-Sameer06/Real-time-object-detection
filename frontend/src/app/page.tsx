import ObjectDetector from "@/components/ObjectDetector";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight">Object Detection</h1>
          </div>
          <p className="text-zinc-500 text-sm ml-11">
            Real-time detection powered by YOLO. Start your camera to detect and classify objects instantly.
          </p>
        </header>

        {/* Detector */}
        <ObjectDetector />

        {/* Footer */}
        <footer className="mt-16 pt-6 border-t border-zinc-800/50 flex items-center justify-between">
          <p className="text-zinc-600 text-xs">Built with YOLO &middot; FastAPI &middot; Next.js</p>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/40" />
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/60" />
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          </div>
        </footer>
      </div>
    </main>
  );
}
