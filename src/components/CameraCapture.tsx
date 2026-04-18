"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, Check, X, SwitchCamera } from "lucide-react";
import toast from "react-hot-toast";

type Facing = "user" | "environment";

export function CameraCapture({
  onCapture,
  onClose,
}: {
  onCapture: (file: File) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facing, setFacing] = useState<Facing>("user");
  const [snapshot, setSnapshot] = useState<{ url: string; blob: Blob } | null>(null);
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      setStarting(true);
      try {
        stopStream();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 1280 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
      } catch (err) {
        toast.error(
          err instanceof Error
            ? `Camera blocked: ${err.message}`
            : "Could not access camera"
        );
        onClose();
      } finally {
        if (!cancelled) setStarting(false);
      }
    }
    start();
    return () => {
      cancelled = true;
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing]);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function snap() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) {
      toast.error("Camera not ready yet");
      return;
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Mirror front camera so the snapshot matches what the user saw.
    if (facing === "user") {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, w, h);

    canvas.toBlob(
      (blob) => {
        if (!blob) return toast.error("Snapshot failed");
        const url = URL.createObjectURL(blob);
        setSnapshot({ url, blob });
      },
      "image/jpeg",
      0.92
    );
  }

  function retake() {
    if (snapshot) URL.revokeObjectURL(snapshot.url);
    setSnapshot(null);
  }

  function confirm() {
    if (!snapshot) return;
    const file = new File([snapshot.blob], `capture-${Date.now()}.jpg`, {
      type: "image/jpeg",
    });
    onCapture(file);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-neutral-800 bg-neutral-950 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800">
          <h2 className="text-sm font-medium">
            {snapshot ? "Use this photo?" : "Take a photo"}
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-neutral-400 hover:bg-neutral-800 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <div className="relative aspect-video bg-black flex items-center justify-center">
          {snapshot ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={snapshot.url} alt="snapshot" className="h-full w-full object-contain" />
          ) : (
            <video
              ref={videoRef}
              playsInline
              muted
              className={
                "h-full w-full object-contain " + (facing === "user" ? "scale-x-[-1]" : "")
              }
            />
          )}
          {starting && !snapshot && (
            <p className="absolute text-sm text-neutral-400">Starting camera…</p>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="flex items-center justify-between gap-2 p-3 border-t border-neutral-800">
          {snapshot ? (
            <>
              <button
                onClick={retake}
                className="inline-flex items-center gap-1.5 rounded border border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-800"
              >
                <RefreshCw size={14} /> Retake
              </button>
              <button
                onClick={confirm}
                className="inline-flex items-center gap-1.5 rounded bg-indigo-500 px-4 py-1.5 text-sm font-medium hover:bg-indigo-400"
              >
                <Check size={14} /> Use photo
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setFacing(facing === "user" ? "environment" : "user")}
                className="inline-flex items-center gap-1.5 rounded border border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-800"
                title="Switch camera"
              >
                <SwitchCamera size={14} /> Flip
              </button>
              <button
                onClick={snap}
                disabled={starting}
                className="inline-flex items-center gap-1.5 rounded bg-white text-black px-4 py-1.5 text-sm font-medium hover:bg-neutral-200 disabled:opacity-50"
              >
                <Camera size={14} /> Capture
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
