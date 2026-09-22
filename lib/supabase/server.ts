import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

const noSession = { auth: { persistSession: false, autoRefreshToken: false } };

/** Read-only public client (RLS: select on catalog tables). */
export function getPublicClient(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, noSession);
}

/** Server-only privileged client. Used for inserting orders. Never import in client code. */
export function getServiceClient(): SupabaseClient | null {
  if (typeof window !== "undefined") throw new Error("service client is server-only");
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, noSession);
}
