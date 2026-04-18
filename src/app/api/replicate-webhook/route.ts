import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { mapStatus } from "@/lib/replicate";

export const runtime = "nodejs";

// Replicate POSTs prediction updates here. We auth via a shared-secret query
// param to keep things simple; for production, prefer signed webhooks.
export async function POST(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  const id = url.searchParams.get("id");

  if (!process.env.REPLICATE_WEBHOOK_SECRET || secret !== process.env.REPLICATE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }

  const status = mapStatus(String((body as { status?: string }).status ?? ""));
  const output = (body as { output?: unknown }).output;
  const errorField = (body as { error?: unknown }).error;
  const videoUrl = Array.isArray(output) ? String(output[0]) : output ? String(output) : null;

  const admin = getSupabaseAdmin();
  await admin
    .from("generations")
    .update({
      status,
      video_url: status === "succeeded" ? videoUrl : null,
      error: errorField ? String(errorField) : null,
    })
    .eq("id", id);

  return NextResponse.json({ ok: true });
}
