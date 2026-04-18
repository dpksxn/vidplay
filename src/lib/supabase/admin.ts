import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Service-role client. Server-only. Bypasses RLS — use with care.
// Typed as `SupabaseClient` (no schema generics) so inserts/updates
// accept plain object literals without the inferred-`never` error you
// get from the auto-generated typed client.
let _admin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_admin) return _admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase admin not configured: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  _admin = createClient(url, key, { auth: { persistSession: false } });
  return _admin;
}
