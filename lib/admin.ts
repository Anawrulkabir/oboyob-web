import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/session";
import { isSupabaseConfigured } from "@/lib/supabase/server";

/**
 * Every admin page AND every admin server action must call this.
 * Middleware only checks login; this checks the `admins` table.
 */
export async function requireAdmin() {
  if (!isSupabaseConfigured) redirect("/admin/login");
  const sb = await createSessionClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/admin/login");
  const { data } = await sb.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!data) redirect("/admin/login?error=forbidden");
  return { sb, user };
}
