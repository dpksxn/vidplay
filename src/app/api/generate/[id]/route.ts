import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getReplicate, mapStatus } from "@/lib/replicate";
import type { Generation } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("generations")
    .select("*")
    .eq("id", params.id)
    .single();
  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let row = data as Generation;

  // If still in flight and we have a replicate id, refresh from Replicate.
  // Acts as a fallback when webhooks aren't configured (e.g. localhost dev).
  if (
    row.replicate_id &&
    (row.status === "queued" || row.status === "processing")
  ) {
    try {
      const r = getReplicate();
      const pred = await r.predictions.get(row.replicate_id);
      const newStatus = mapStatus(pred.status);
      const update: Partial<Generation> = { status: newStatus };

      if (pred.status === "succeeded") {
        const output = pred.output;
        const url = Array.isArray(output) ? String(output[0]) : String(output ?? "");
        if (url) update.video_url = url;
      } else if (pred.status === "failed" || pred.status === "canceled") {
        update.error = pred.error ? String(pred.error) : null;
      }

      const admin = getSupabaseAdmin();
      const { data: updated } = await admin
        .from("generations")
        .update(update)
        .eq("id", row.id)
        .select("*")
        .single();
      if (updated) row = updated as Generation;
    } catch {
      // Don't fail the polling request just because Replicate is flaky.
    }
  }

  return NextResponse.json(row);
}
