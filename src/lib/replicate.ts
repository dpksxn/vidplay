import Replicate from "replicate";

// Default model: Kling v1.6 image-to-video (good motion/quality, reasonable cost).
// Swap by changing IMAGE_TO_VIDEO_MODEL — see https://replicate.com/explore for alternatives.
export const IMAGE_TO_VIDEO_MODEL =
  "kwaivgi/kling-v1.6-standard" as const;

export type GenerationInput = {
  prompt: string;
  imageUrl: string;
  durationSec?: 5 | 10;
  aspectRatio?: "16:9" | "9:16" | "1:1";
};

export function getReplicate() {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("REPLICATE_API_TOKEN is not set");
  return new Replicate({ auth: token });
}

export function buildModelInput(input: GenerationInput) {
  return {
    prompt: input.prompt,
    start_image: input.imageUrl,
    duration: input.durationSec ?? 5,
    aspect_ratio: input.aspectRatio ?? "16:9",
    cfg_scale: 0.5,
    negative_prompt: "",
  };
}

// Replicate prediction status → our internal status
export function mapStatus(s: string): "queued" | "processing" | "succeeded" | "failed" | "canceled" {
  switch (s) {
    case "starting":
    case "queued":
      return "queued";
    case "processing":
      return "processing";
    case "succeeded":
      return "succeeded";
    case "failed":
      return "failed";
    case "canceled":
      return "canceled";
    default:
      return "processing";
  }
}
