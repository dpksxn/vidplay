import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GenerationView } from "@/components/GenerationView";
import type { Generation } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function GenerationPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("generations")
    .select("*")
    .eq("id", params.id)
    .single();
  if (error || !data) notFound();
  return <GenerationView initial={data as Generation} />;
}
