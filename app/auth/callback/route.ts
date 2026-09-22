import { NextResponse, type NextRequest } from "next/server";
import { createSessionClient } from "@/lib/supabase/session";

// OAuth (Facebook) lands here with ?code=… — exchange it for a session cookie.
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const next = url.searchParams.get("next") ?? "/account";
  const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/account";
  const code = url.searchParams.get("code");
  if (code) {
    const { error } = await (await createSessionClient()).auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safe, url.origin));
  }
  return NextResponse.redirect(new URL(`/login?error=facebook&next=${encodeURIComponent(safe)}`, url.origin));
}
