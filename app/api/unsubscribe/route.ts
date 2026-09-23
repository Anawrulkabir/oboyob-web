import { optOut } from "@/lib/optout";

// One-click unsubscribe from the email client's own "Unsubscribe" button.
export async function POST(req: Request) {
  const url = new URL(req.url);
  const ok = await optOut(url.searchParams.get("e") ?? "", url.searchParams.get("s") ?? "");
  return new Response(ok ? "Unsubscribed" : "Invalid link", { status: ok ? 200 : 400 });
}
