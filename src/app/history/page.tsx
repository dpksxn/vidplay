import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatRelative } from "@/lib/utils";
import type { Generation } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("generations")
    .select("*")
    .order("created_at", { ascending: false });

  const items = (data ?? []) as Generation[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your generations</h1>
        <Link
          href="/"
          className="rounded bg-indigo-500 px-3 py-1.5 text-sm hover:bg-indigo-400"
        >
          + New
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-neutral-400 text-sm">
          Nothing yet. <Link href="/" className="underline">Create your first video.</Link>
        </p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((g) => (
            <li
              key={g.id}
              className="rounded-lg border border-neutral-800 bg-neutral-900/40 overflow-hidden hover:border-neutral-600 transition"
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
                      onMouseEnter={undefined}
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
                  <span
                    className={
                      "absolute top-2 left-2 rounded px-2 py-0.5 text-[10px] uppercase tracking-wide " +
                      statusBadge(g.status)
                    }
                  >
                    {g.status}
                  </span>
                </div>
                <div className="p-3">
                  <p className="text-sm line-clamp-2 text-neutral-100">{g.prompt}</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {formatRelative(g.created_at)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function statusBadge(s: Generation["status"]): string {
  switch (s) {
    case "succeeded":
      return "bg-emerald-500/20 text-emerald-300";
    case "failed":
    case "canceled":
      return "bg-red-500/20 text-red-300";
    default:
      return "bg-neutral-700/70 text-neutral-200";
  }
}
