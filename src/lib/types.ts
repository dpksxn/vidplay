export type GenerationStatus =
  | "queued"
  | "processing"
  | "succeeded"
  | "failed"
  | "canceled";

export type Generation = {
  id: string;
  user_id: string;
  prompt: string;
  image_path: string;
  image_url: string;
  video_url: string | null;
  status: GenerationStatus;
  error: string | null;
  replicate_id: string | null;
  model: string;
  created_at: string;
  updated_at: string;
};
