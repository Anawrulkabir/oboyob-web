import "server-only";
import { getServiceClient } from "@/lib/supabase/server";
import { verifyEmailSignature } from "@/lib/unsubscribe";

/** Records an opt-out from new-product emails. False if the link isn't genuine. */
export async function optOut(email: string, sig: string): Promise<boolean> {
  const e = email.trim().toLowerCase();
  if (!e || !verifyEmailSignature(e, sig)) return false;
  const db = getServiceClient();
  if (!db) return false;
  const { error } = await db.from("email_optouts").upsert({ email: e }, { onConflict: "email", ignoreDuplicates: true });
  if (error) console.error("optout", error);
  return !error;
}
