"use client";

import { ChangeEvent, FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Camera, ImagePlus, Loader2, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/utils";
import { CameraCapture } from "./CameraCapture";

const PROMPT_EXAMPLES = [
  "Does a dramatic spit-take after sipping coffee",
  "Breakdances unexpectedly with confetti exploding around them",
  "Slowly turns to camera, raises one eyebrow, smirks",
  "Eats an entire slice of pizza in one impossible bite",
  "Gets startled by a tiny dragon flying past",
  "Dabs while glitter rains from the sky",
];

type Style = {
  id: "none" | "comic" | "cartoon" | "anime" | "claymation" | "vhs" | "lego";
  label: string;
  modifier: string;
};

const STYLES: Style[] = [
  { id: "none", label: "Realistic", modifier: "" },
  {
    id: "comic",
    label: "Comic",
    modifier:
      ", western comic book illustration, bold black ink outlines, halftone dot shading, vibrant flat colors, dynamic action poses, BAM and POW style energy",
  },
  {
    id: "cartoon",
    label: "Cartoon",
    modifier:
      ", 3D Pixar-style cartoon, exaggerated expressive motion, squash-and-stretch animation, vibrant saturated colors, cinematic lighting",
  },
  {
    id: "anime",
    label: "Anime",
    modifier:
      ", anime style, expressive cel-shaded animation, dramatic motion lines, vibrant colors, Studio Ghibli energy",
  },
  {
    id: "claymation",
    label: "Claymation",
    modifier:
      ", stop-motion claymation style, soft plasticine textures, slightly jerky charming movement, Aardman Animations vibe",
  },
  {
    id: "vhs",
    label: "VHS",
    modifier:
      ", 90s VHS home-video aesthetic, grainy low-resolution, slight color bleed and chromatic aberration, nostalgic warmth",
  },
  {
    id: "lego",
    label: "LEGO",
    modifier:
      ", LEGO brick stop-motion animation, plastic minifigure characters, blocky charming movement",
  },
];

export function GenerateForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState<5 | 10>(5);
  const [aspect, setAspect] = useState<"16:9" | "9:16" | "1:1">("16:9");
  const [styleId, setStyleId] = useState<Style["id"]>("none");
  const [busy, setBusy] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  function acceptFile(f: File) {
    if (!ALLOWED_IMAGE_TYPES.includes(f.type)) {
      toast.error("Use JPG, PNG, or WebP");
      return;
    }
    if (f.size > MAX_IMAGE_BYTES) {
      toast.error("Image must be under 8 MB");
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  }

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) acceptFile(f);
  }

  function clearFile() {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.error("Pick a photo first");
      return;
    }
    if (prompt.trim().length < 4) {
      toast.error("Add a longer prompt");
      return;
    }

    setBusy(true);
    const supabase = createSupabaseBrowserClient();

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      // 1. Upload image to Supabase Storage (path scoped to user).
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("inputs")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("inputs").getPublicUrl(path);

      // 2. Build final prompt with style modifier and kick off generation.
      const styleModifier = STYLES.find((s) => s.id === styleId)?.modifier ?? "";
      const finalPrompt = (prompt.trim() + styleModifier).slice(0, 500);

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt: finalPrompt,
          imagePath: path,
          imageUrl: pub.publicUrl,
          durationSec: duration,
          aspectRatio: aspect,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Failed (${res.status})`);
      }
      const { id } = await res.json();
      toast.success("Generation started");
      router.push(`/g/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 sm:p-6 space-y-5"
    >
      <div className="grid grid-cols-1 sm:grid-cols-[240px_1fr] gap-5">
        {/* Image picker */}
        <div>
          <label className="block text-xs uppercase tracking-wide text-neutral-400 mb-2">
            Photo
          </label>
          {previewUrl ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="preview"
                className="w-full aspect-square object-cover rounded-lg border border-neutral-800"
              />
              <button
                type="button"
                onClick={clearFile}
                className="absolute top-2 right-2 rounded-full bg-black/70 p-1 hover:bg-black"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 w-full aspect-square">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-700 hover:border-neutral-500 text-neutral-400 hover:text-neutral-200 px-2 text-center"
              >
                <ImagePlus size={24} />
                <span className="mt-2 text-xs">Upload</span>
                <span className="mt-1 text-[10px] text-neutral-500">JPG/PNG/WebP</span>
              </button>
              <button
                type="button"
                onClick={() => setCameraOpen(true)}
                className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-700 hover:border-neutral-500 text-neutral-400 hover:text-neutral-200 px-2 text-center"
              >
                <Camera size={24} />
                <span className="mt-2 text-xs">Take photo</span>
                <span className="mt-1 text-[10px] text-neutral-500">Use camera</span>
              </button>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_IMAGE_TYPES.join(",")}
            onChange={handleFile}
            className="hidden"
          />
          {cameraOpen && (
            <CameraCapture
              onCapture={acceptFile}
              onClose={() => setCameraOpen(false)}
            />
          )}
        </div>

        {/* Prompt + options */}
        <div className="space-y-3">
          <label className="block text-xs uppercase tracking-wide text-neutral-400">
            What should happen?
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
            maxLength={500}
            placeholder="Describe the action, camera movement, mood..."
            className="w-full resize-none rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
          />
          <div className="flex flex-wrap gap-1.5">
            {PROMPT_EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setPrompt(ex)}
                className="text-[11px] rounded-full border border-neutral-700 px-2 py-1 text-neutral-400 hover:text-neutral-100 hover:border-neutral-500"
              >
                {ex}
              </button>
            ))}
          </div>

          <div className="pt-2">
            <div className="text-[10px] uppercase tracking-wide text-neutral-500 mb-1.5">
              Style
            </div>
            <div className="flex flex-wrap gap-1.5">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStyleId(s.id)}
                  className={
                    "text-xs rounded-full px-3 py-1 border transition " +
                    (s.id === styleId
                      ? "bg-gradient-to-r from-fuchsia-500 to-indigo-500 border-transparent text-white"
                      : "border-neutral-700 text-neutral-300 hover:border-neutral-500")
                  }
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 pt-2">
            <SegmentedControl
              label="Duration"
              value={duration}
              onChange={(v) => setDuration(v as 5 | 10)}
              options={[
                { label: "5s", value: 5 },
                { label: "10s", value: 10 },
              ]}
            />
            <SegmentedControl
              label="Aspect"
              value={aspect}
              onChange={(v) => setAspect(v as "16:9" | "9:16" | "1:1")}
              options={[
                { label: "16:9", value: "16:9" },
                { label: "9:16", value: "9:16" },
                { label: "1:1", value: "1:1" },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-5 py-2.5 text-sm font-medium hover:opacity-95 disabled:opacity-50"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : null}
          {busy ? "Starting…" : "Generate video"}
        </button>
      </div>
    </form>
  );
}

function SegmentedControl<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { label: string; value: T }[];
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-neutral-500 mb-1">
        {label}
      </div>
      <div className="inline-flex rounded-md border border-neutral-700 overflow-hidden">
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            onClick={() => onChange(o.value)}
            className={
              "px-3 py-1 text-xs " +
              (o.value === value
                ? "bg-neutral-100 text-neutral-900"
                : "bg-transparent text-neutral-300 hover:bg-neutral-800")
            }
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
