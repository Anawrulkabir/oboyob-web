import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { createSessionClient } from "@/lib/supabase/session";

export const dynamic = "force-dynamic";

// Lets static product pages prefill the order form without shipping the Supabase SDK to the browser.
export async function GET() {
  if (!isSupabaseConfigured) return NextResponse.json({ user: null });
  const sb = await createSessionClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ user: null }, { headers: { "Cache-Control": "no-store" } });
  const { data: profile } = await sb.from("profiles").select("full_name, phone, address").eq("id", user.id).maybeSingle();
  return NextResponse.json(
    { user: { email: user.email ?? null }, profile: profile ?? null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
