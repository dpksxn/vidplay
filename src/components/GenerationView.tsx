"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import type { Generation } from "@/lib/types";
import { formatRelative } from "@/lib/utils";

const POLL_INTERVAL_MS = 4000;
const TERMINAL_STATUSES = new Set(["succeeded", "failed", "canceled"]);

export function GenerationView({ initial }: { initial: Generation }) {
  const [gen, setGen] = useState<Generation>(initial);
  const stoppedRef = useRef(TERMINAL_STATUSES.has(initial.status));

  useEffect(() => {
    if (stoppedRef.current) return;
    let active = true;
    const tick = async () => {
      try {
        const res = await fetch(`/api/generate/${gen.id}`, { cache: "no-store" });
        if (!res.ok) return;
        const next = (await res.json()) as Generation;
        if (!active) return;
        setGen(next);
        if (TERMINAL_STATUSES.has(next.status)) {
          stoppedRef.current = true;
          clearInterval(handle);
        }
      } catch {
        // swallow; next tick will retry
      }
    };
    const handle = setInterval(tick, POLL_INTERVAL_MS);
    tick();
    return () => {
      active = false;
      clearInterval(handle);
    };
  }, [gen.id]);

  const isWorking = gen.status === "queued" || gen.status === "processing";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-neutral-400 hover:text-white">
          ← New generation
        </Link>
        <span className="text-xs text-neutral-500">{formatRelative(gen.created_at)}</span>
      </div>

      <div className="rounded-xl overflow-hidden border border-neutral-800 bg-neutral-900/40">
        <div className="aspect-video bg-black relative flex items-center justify-center">
          {gen.status === "succeeded" && gen.video_url ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video
              src={gen.video_url}
              controls
              autoPlay
              loop
              playsInline
              className="h-full w-full object-contain"
            />
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={gen.image_url}
                alt=""
                className="h-full w-full object-contain opacity-40"
              />
              {isWorking && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-neutral-200">
                  <Loader2 size={28} className="animate-spin" />
                  <p className="text-sm capitalize">{gen.status}…</p>
                  <p className="text-xs text-neutral-500">
                    Image-to-video typically takes 30–90 seconds.
                  </p>
                </div>
              )}
              {gen.status === "failed" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                  <p className="text-red-400 font-medium">Generation failed</p>
                  {gen.error && (
                    <p className="mt-2 text-xs text-neutral-400 max-w-md">{gen.error}</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-4 space-y-3">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-neutral-500">Prompt</div>
            <p className="text-sm text-neutral-100">{gen.prompt}</p>
          </div>

          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Model: {gen.model}</span>
            {gen.video_url && (
              <a
                href={gen.video_url}
                download
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded border border-neutral-700 px-2 py-1 text-neutral-200 hover:bg-neutral-800"
              >
                <Download size={12} /> Download
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
