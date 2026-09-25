import "server-only";
import { getServiceClient } from "@/lib/supabase/server";
import { PRODUCT_SELECT, normalizeProduct } from "@/lib/products";
import { emailConfigured, sendEmail } from "@/lib/notify";
import { unsubscribeHeaders, unsubscribeUrl } from "@/lib/unsubscribe";
import { site } from "@/lib/site";
import type { Product } from "@/types/product";

// "New product" email to everyone who has ordered or has an account, minus
// people who unsubscribed. Sent once per product (products.announced_at).

/** Gmail allows roughly 500 messages a day; stay under it. */
export const ANNOUNCE_LIMIT = 400;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const tk = (n: number) => `Tk ${n.toLocaleString("en-IN")}`;
const abs = (u: string) => (u.startsWith("http") ? u : `${site.url}${u}`);

export async function announcementRecipients(): Promise<{ email: string; name: string | null }[]> {
  const db = getServiceClient();
  if (!db) return [];
  const { data, error } = await db.rpc("announcement_recipients");
  if (error) { console.error("recipients", error); return []; }
  return (data ?? []) as { email: string; name: string | null }[];
}

export function announcementHtml(p: Product, to: { email: string; name: string | null }) {
  const url = `${site.url}/product/${p.slug}`;
  const img = p.images[0]?.image_url;
  const first = to.name?.trim().split(/\s+/)[0];
  const lead = p.description?.split(/\n\s*\n/)[0];
  return `<div style="background:#f3ece0;padding:24px 12px">
  <div style="font-family:Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;color:#231f1b;background:#fbf8f2;padding:32px 28px;line-height:1.6;font-size:15px;border-top:4px solid #a8742a">
    <table role="presentation" style="border-collapse:collapse;margin:0 0 22px"><tr>
      <td style="padding:0 14px 0 0"><img src="${site.url}/images/logo.png" width="43" height="56" alt="${esc(site.nameEn)}" style="display:block;border:0"></td>
      <td><p style="font-size:20px;margin:0;letter-spacing:0.5px">${esc(site.nameEn.toUpperCase())}</p><p style="margin:0;color:#6b6157;font-size:13px">${esc(site.tagline)}</p></td>
    </tr></table>
    <p style="margin:0 0 16px">${first ? `Hi ${esc(first)},` : "Hello,"}</p>
    <p style="margin:0 0 20px">Something new just arrived at ${esc(site.nameEn)} — we thought you'd like to see it first.</p>
    ${img ? `<a href="${url}"><img src="${abs(img)}" alt="${esc(p.name)}" width="504" style="display:block;width:100%;max-width:504px;height:auto;border:0"></a>` : ""}
    <p style="font-size:22px;margin:18px 0 2px">${esc(p.name)}</p>
    ${p.subtitle ? `<p style="margin:0;color:#6b6157">${esc(p.subtitle)}</p>` : ""}
    ${p.price != null ? `<p style="margin:10px 0 0;font-size:18px">${tk(p.price)}${p.stock <= 3 ? ` <span style="font-size:13px;color:#a8742a">· only ${p.stock} available</span>` : ""}</p>` : ""}
    ${lead ? `<p style="margin:14px 0 0;color:#3b342e">${esc(lead)}</p>` : ""}
    <p style="margin:24px 0 0"><a href="${url}" style="display:inline-block;background:#231f1b;color:#fbf8f2;padding:12px 22px;text-decoration:none">View product</a></p>
    <p style="margin:18px 0 0;font-size:13px;color:#6b6157">Cash on delivery · Home delivery all over Bangladesh</p>
    <p style="margin-top:28px;font-size:12px;color:#6b6157;border-top:1px solid #e3d9c8;padding-top:14px">
      You're getting this because you shopped with ${esc(site.nameEn)}.
      <a href="${unsubscribeUrl(to.email)}" style="color:#6b6157">Unsubscribe from new-product emails</a>
    </p>
  </div>
</div>`;
}

export type AnnounceResult = { ok: true; sent: number; failed: number; skipped: number } | { ok: false; error: string };

/** Emails every recipient about product `id` and records it. Safe to call once; refuses a second time. */
export async function announceProduct(id: string): Promise<AnnounceResult> {
  const db = getServiceClient();
  if (!db) return { ok: false, error: "Database not configured." };
  if (!emailConfigured()) return { ok: false, error: "ইমেইল চালু নেই — Vercel-এ SMTP_USER ও SMTP_PASS দিন।" };

  // Claim the product first so a double click can't send twice.
  const { data: claimed } = await db.from("products").update({ announced_at: new Date().toISOString() })
    .eq("id", id).is("announced_at", null).select(PRODUCT_SELECT).maybeSingle();
  if (!claimed) return { ok: false, error: "এই পণ্যের ইমেইল আগেই পাঠানো হয়েছে।" };
  const product = normalizeProduct(claimed as unknown as Product);

  const all = await announcementRecipients();
  const list = all.slice(0, ANNOUNCE_LIMIT);
  let sent = 0, failed = 0, firstError = "";
  for (const to of list) {
    const r = await sendEmail(to.email, `New at ${site.nameEn}: ${product.name}`, announcementHtml(product, to), [], unsubscribeHeaders(to.email));
    if (r.ok) sent++; else { failed++; firstError ||= r.error; console.error("announce", to.email, r.error); }
  }
  if (sent === 0 && failed > 0) {
    // Nothing went out (e.g. Gmail login rejected) — let the admin try again.
    await db.from("products").update({ announced_at: null }).eq("id", id);
    return { ok: false, error: firstError };
  }
  await db.from("products").update({ announced_count: sent }).eq("id", id);
  return { ok: true, sent, failed, skipped: all.length - list.length };
}
