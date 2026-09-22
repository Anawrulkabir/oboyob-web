import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

type CookieToSet = { name: string; value: string; options: CookieOptions };

// Refreshes the auth session on account/admin routes and gates them.
// Public shop pages don't run this, so they stay static and fast.
export async function middleware(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const path = req.nextUrl.pathname;
  const isAdmin = path.startsWith("/admin");
  const isAdminLogin = path === "/admin/login";

  if (!url || !key) {
    if (isAdmin && !isAdminLogin) return NextResponse.redirect(new URL("/admin/login", req.url));
    return NextResponse.next();
  }

  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list: CookieToSet[]) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  if (isAdmin && !isAdminLogin && !user) return NextResponse.redirect(new URL("/admin/login", req.url));
  if (path.startsWith("/account") && !user) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(path)}`, req.url));
  }
  if (path === "/login" && user) {
    const next = req.nextUrl.searchParams.get("next") ?? "/account";
    return NextResponse.redirect(new URL(next.startsWith("/") && !next.startsWith("//") ? next : "/account", req.url));
  }
  return res;
}

export const config = { matcher: ["/admin/:path*", "/account/:path*", "/login"] };
