import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { site } from "@/lib/site";

// Signed unsubscribe links: /unsubscribe?e=<email>&s=<signature>. The
// signature proves the link came from one of our emails, so nobody can
// unsubscribe someone else by typing their address.

const secret = () => process.env.UNSUBSCRIBE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "dev-only";

export const signEmail = (email: string) =>
  createHmac("sha256", secret()).update(email.toLowerCase()).digest("base64url").slice(0, 32);

export function verifyEmailSignature(email: string, sig: string): boolean {
  const a = Buffer.from(signEmail(email));
  const b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const unsubscribeUrl = (email: string) =>
  `${site.url}/unsubscribe?e=${encodeURIComponent(email)}&s=${signEmail(email)}`;

/** One-click unsubscribe (RFC 8058) — Gmail shows an "Unsubscribe" button for it. */
export const unsubscribeHeaders = (email: string) => ({
  "List-Unsubscribe": `<${site.url}/api/unsubscribe?e=${encodeURIComponent(email)}&s=${signEmail(email)}>`,
  "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
});
