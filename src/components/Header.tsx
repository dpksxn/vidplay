import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SignOutButton } from "./SignOutButton";

export async function Header() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-neutral-800 bg-neutral-950/70 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="inline-block h-6 w-6 rounded bg-gradient-to-br from-fuchsia-500 to-indigo-500" />
          vidplay
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <Link href="/" className="text-neutral-300 hover:text-white">
                New
              </Link>
              <Link href="/history" className="text-neutral-300 hover:text-white">
                History
              </Link>
              <span className="text-neutral-500 hidden sm:inline">{user.email}</span>
              <SignOutButton />
            </>
          ) : (
            <Link href="/login" className="text-neutral-300 hover:text-white">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
