import { createBrowserClient } from "@supabase/ssr";

/** Browser client — used only in the admin image uploader (direct-to-Storage uploads). */
export function createBrowserSupabase() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
