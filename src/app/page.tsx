import Link from "next/link";
import { GenerateForm } from "@/components/GenerateForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatRelative } from "@/lib/utils";
import type { Generation } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("generations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(3);

  const recent = (data ?? []) as Generation[];

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">
          Turn a photo into a video.
        </h1>
        <p className="mt-2 text-neutral-400">
          Upload an image, describe what should happen, and we&apos;ll animate it.
        </p>
      </section>

      <GenerateForm />

      {recent.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm uppercase tracking-wide text-neutral-400">
              Recent
            </h2>
            <Link href="/history" className="text-xs text-neutral-400 hover:text-white">
              View all →
            </Link>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {recent.map((g) => (
              <li
                key={g.id}
                className="rounded border border-neutral-800 bg-neutral-900/40 overflow-hidden"
              >
                <Link href={`/g/${g.id}`}>
                  <div className="aspect-video bg-neutral-900 relative">
                    {g.video_url ? (
                      // eslint-disable-next-line jsx-a11y/media-has-caption
                      <video
                        src={g.video_url}
                        muted
                        loop
                        playsInline
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={g.image_url}
                        alt=""
                        className="h-full w-full object-cover opacity-60"
                      />
                    )}
                    <span className="absolute top-2 left-2 rounded bg-black/60 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                      {g.status}
                    </span>
                  </div>
                  <div className="p-2 text-xs">
                    <p className="line-clamp-2 text-neutral-200">{g.prompt}</p>
                    <p className="mt-1 text-neutral-500">{formatRelative(g.created_at)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
