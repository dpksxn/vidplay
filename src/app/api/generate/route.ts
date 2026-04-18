import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  IMAGE_TO_VIDEO_MODEL,
  buildModelInput,
  getReplicate,
  mapStatus,
} from "@/lib/replicate";

export const runtime = "nodejs";

const Body = z.object({
  prompt: z.string().min(4).max(500),
  imagePath: z.string().min(1),
  imageUrl: z.string().url(),
  durationSec: z.union([z.literal(5), z.literal(10)]).default(5),
  aspectRatio: z.enum(["16:9", "9:16", "1:1"]).default("16:9"),
});

export async function POST(req: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid input" },
      { status: 400 }
    );
  }

  // Insert pending row first so we can return an id immediately and
  // recover even if Replicate kickoff fails.
  const admin = getSupabaseAdmin();
  const { data: row, error: insErr } = await admin
    .from("generations")
    .insert({
      user_id: user.id,
      prompt: body.prompt,
      image_path: body.imagePath,
      image_url: body.imageUrl,
      status: "queued",
      model: IMAGE_TO_VIDEO_MODEL,
    })
    .select("id")
    .single();
  if (insErr || !row) {
    return NextResponse.json({ error: insErr?.message || "DB insert failed" }, { status: 500 });
  }

  // Kick off Replicate prediction.
  try {
    const replicate = getReplicate();
    const webhookSecret = process.env.REPLICATE_WEBHOOK_SECRET;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const useWebhook = Boolean(webhookSecret && appUrl && !appUrl.includes("localhost"));

    const prediction = await replicate.predictions.create({
      model: IMAGE_TO_VIDEO_MODEL,
      input: buildModelInput({
        prompt: body.prompt,
        imageUrl: body.imageUrl,
        durationSec: body.durationSec,
        aspectRatio: body.aspectRatio,
      }),
      ...(useWebhook
        ? {
            webhook: `${appUrl}/api/replicate-webhook?secret=${webhookSecret}&id=${row.id}`,
            webhook_events_filter: ["completed"],
          }
        : {}),
    });

    await admin
      .from("generations")
      .update({
        replicate_id: prediction.id,
        status: mapStatus(prediction.status),
      })
      .eq("id", row.id);

    return NextResponse.json({ id: row.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Replicate kickoff failed";
    await admin
      .from("generations")
      .update({ status: "failed", error: message })
      .eq("id", row.id);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
