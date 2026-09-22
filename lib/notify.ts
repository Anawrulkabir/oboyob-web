/**
 * Notifications. Every channel is optional and switched on by env vars.
 * Automatic notifications never throw — a failed notification must never fail an order.
 *
 *   Seller:   Telegram (free, instant push)  +  email
 *   Customer: email (English, like the payment slip)  +  SMS via any HTTP gateway (optional)
 */
import { site } from "@/lib/site";
import type { OrderStatus } from "@/lib/order-status";
import { deliveryZone } from "@/lib/delivery";
import { orderRef, type Order } from "@/lib/orders";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const tk = (n: number | null | undefined) => `Tk ${(n ?? 0).toLocaleString("en-IN")}`;
const itemsLine = (o: Order) => o.items.map((i) => `${i.product_name} × ${i.quantity}`).join(", ");
export const slipUrl = (o: Pick<Order, "id" | "slip_token">) => `${site.url}/order/${o.id}?t=${o.slip_token}`;

// ---------------------------------------------------------------- channels

async function telegram(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return;
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text, parse_mode: "HTML", disable_web_page_preview: true }),
    });
    if (!r.ok) console.error("telegram", r.status, await r.text());
  } catch (e) { console.error("telegram", e); }
}

/** "Name <a@b.c>" → { name, email } */
function parseFrom(from: string) {
  const m = from.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/);
  return m ? { name: m[1].trim(), email: m[2].trim() } : { email: from.trim() };
}

export interface Attachment { filename: string; content: Buffer }

export const emailConfigured = () => !!process.env.EMAIL_FROM && !!(process.env.BREVO_API_KEY || process.env.RESEND_API_KEY);

/**
 * Sends one email and reports the result (the admin "Send email" button needs it).
 * Brevo if BREVO_API_KEY is set (free 300/day, single verified sender — no
 * domain needed), otherwise Resend (needs a domain).
 */
export async function sendEmail(to: string, subject: string, html: string, attachments: Attachment[] = []):
  Promise<{ ok: true } | { ok: false; error: string }> {
  const from = process.env.EMAIL_FROM;
  if (!from || !emailConfigured()) return { ok: false, error: "Email is not set up (EMAIL_FROM + BREVO_API_KEY or RESEND_API_KEY)." };
  if (!to) return { ok: false, error: "No recipient." };
  try {
    let r: Response;
    if (process.env.BREVO_API_KEY) {
      r = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": process.env.BREVO_API_KEY, "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          sender: parseFrom(from), to: [{ email: to }], subject, htmlContent: html,
          ...(attachments.length && { attachment: attachments.map((a) => ({ name: a.filename, content: a.content.toString("base64") })) }),
        }),
      });
    } else {
      r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from, to, subject, html,
          ...(attachments.length && { attachments: attachments.map((a) => ({ filename: a.filename, content: a.content.toString("base64") })) }),
        }),
      });
    }
    if (!r.ok) {
      const body = await r.text();
      console.error("email", r.status, body);
      return { ok: false, error: `Email provider said ${r.status}: ${body.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    console.error("email", e);
    return { ok: false, error: (e as Error).message };
  }
}

async function email(to: string, subject: string, html: string) {
  if (emailConfigured()) await sendEmail(to, subject, html);
}

/**
 * Provider-agnostic SMS. SMS_API_URL is a URL template, e.g. for a BD gateway:
 *   https://gateway.example/api/send?api_key=KEY&senderid=ID&number={number}&message={message}
 * {number} → 8801XXXXXXXXX, {message} → URL-encoded text. Leave unset to disable.
 */
export async function sendSmsStrict(localPhone: string, text: string): Promise<void> {
  const tpl = process.env.SMS_API_URL;
  if (!tpl) throw new Error("SMS_API_URL not set");
  const url = tpl.replace("{number}", "88" + localPhone).replace("{message}", encodeURIComponent(text));
  const r = await fetch(url);
  if (!r.ok) throw new Error(`sms ${r.status}: ${await r.text()}`);
}

async function sms(localPhone: string, text: string) {
  if (!process.env.SMS_API_URL) return;
  try { await sendSmsStrict(localPhone, text); } catch (e) { console.error("sms", e); }
}

// ------------------------------------------------------------ email layout

/** Wraps a message in the shop's email frame (English). `message` is plain text; blank lines = paragraphs. */
export function emailHtml(message: string, o?: Order, extra = "") {
  const paras = esc(message).split(/\n\s*\n/).map((p) => `<p style="margin:0 0 14px">${p.replace(/\n/g, "<br>")}</p>`).join("");
  return `<div style="background:#f3ece0;padding:24px 12px">
  <div style="font-family:Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;color:#231f1b;background:#fbf8f2;padding:32px 28px;line-height:1.6;font-size:15px;border-top:4px solid #a8742a">
    <p style="font-size:22px;margin:0 0 4px;letter-spacing:0.5px">${esc(site.nameEn.toUpperCase())}</p>
    <p style="margin:0 0 24px;color:#6b6157;font-size:13px">${esc(site.tagline)}</p>
    ${paras}
    ${o ? orderTable(o) : ""}
    ${extra}
    <p style="margin-top:28px;font-size:12px;color:#6b6157;border-top:1px solid #e3d9c8;padding-top:14px">
      Questions? Message us on Facebook: <a href="${site.facebook}" style="color:#a8742a">${site.facebook}</a>
    </p>
  </div>
</div>`;
}

function orderTable(o: Order) {
  const cell = "padding:8px 0;border-bottom:1px solid #e3d9c8";
  const rows = o.items.map((i) => `<tr><td style="${cell}">${esc(i.product_name)}<br><span style="color:#6b6157;font-size:12px">${esc(i.product_code)} · ${tk(i.unit_price)} × ${i.quantity}</span></td><td style="${cell};text-align:right;white-space:nowrap">${tk(i.unit_price * i.quantity)}</td></tr>`).join("");
  const line = (k: string, v: string, bold = false) =>
    `<tr><td style="padding:4px 0;color:${bold ? "#231f1b" : "#6b6157"}${bold ? ";font-weight:bold" : ""}">${k}</td><td style="padding:4px 0;text-align:right${bold ? ";font-weight:bold;font-size:17px" : ""}">${v}</td></tr>`;
  const zone = deliveryZone(o.delivery_zone);
  return `<p style="margin:22px 0 6px;font-size:13px;color:#6b6157">ORDER #${orderRef(o.id)}</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>
  <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:8px">
    ${line("Subtotal", tk(o.subtotal))}
    ${o.discount ? line(`Coupon (${esc(o.coupon_code ?? "")})`, `− ${tk(o.discount)}`) : ""}
    ${line(`Delivery${zone ? ` (${zone.labelEn})` : ""}`, tk(o.delivery_charge))}
    ${line("Total — Cash on Delivery", tk(o.total), true)}
  </table>
  <p style="margin:16px 0 0;font-size:13px;color:#6b6157">Deliver to: ${esc(o.customer_name)}, ${esc(o.customer_phone)}<br>${esc(o.customer_address).replace(/\n/g, "<br>")}</p>`;
}

// ------------------------------------------------------------------ events

export async function notifyNewOrder(o: Order) {
  const admin = `${site.url}/admin/orders/${o.id}`;
  await Promise.all([
    telegram(
      `🛍 <b>নতুন অর্ডার</b> #${orderRef(o.id)} — ${tk(o.total)} (COD)\n` +
      o.items.map((i) => `• ${esc(i.product_name)} (${i.product_code}) × ${i.quantity}`).join("\n") + "\n" +
      (o.coupon_code ? `🏷 ${esc(o.coupon_code)} (−${tk(o.discount)})\n` : "") +
      `🚚 ${deliveryZone(o.delivery_zone)?.label ?? ""} ${tk(o.delivery_charge)}\n\n` +
      `👤 ${esc(o.customer_name)}\n📞 ${o.customer_phone}\n📍 ${esc(o.customer_address)}` +
      (o.note ? `\n📝 ${esc(o.note)}` : "") + `\n\n${admin}`,
    ),
    process.env.SELLER_EMAIL &&
      email(process.env.SELLER_EMAIL, `New order #${orderRef(o.id)} — ${tk(o.total)}`,
        emailHtml(`A new order has arrived.${o.note ? `\n\nCustomer note: ${o.note}` : ""}`, o,
          `<p style="margin-top:18px"><a href="${admin}" style="color:#a8742a">Open in admin</a></p>`)),
    o.customer_email &&
      email(o.customer_email, `We've received your order #${orderRef(o.id)}`,
        emailHtml(`Dear ${o.customer_name},\n\nThank you for shopping with ${site.nameEn}. We have received your order and will call you shortly to confirm it. Payment is cash on delivery.`, o,
          `<p style="margin-top:18px"><a href="${slipUrl(o)}" style="display:inline-block;background:#231f1b;color:#fbf8f2;padding:10px 18px;text-decoration:none">View payment slip</a></p>`)),
    sms(o.customer_phone, `${site.nameEn}: order #${orderRef(o.id)} received (${itemsLine(o)}). Total ${tk(o.total)}, cash on delivery. We'll call to confirm.`),
  ]);
}

const STATUS_MESSAGE: Partial<Record<OrderStatus, string>> = {
  shipped: "Good news — your order is on its way. You'll receive it soon.",
  delivered: "Your order has been delivered. Thank you for shopping with us!",
  cancelled: "Your order has been cancelled. If you have any questions, please message us.",
};

/**
 * Automatic updates when the admin changes an order's status. "Confirmed" is
 * not sent here — the admin sends that one by hand, with the slip attached.
 */
export async function notifyStatusChange(o: Order, status: OrderStatus) {
  const msg = STATUS_MESSAGE[status];
  if (!msg) return;
  await Promise.all([
    o.customer_email &&
      email(o.customer_email, `Order #${orderRef(o.id)}: ${status === "shipped" ? "shipped" : status}`,
        emailHtml(`Dear ${o.customer_name},\n\n${msg}`, o)),
    sms(o.customer_phone, `${site.nameEn}: order #${orderRef(o.id)} — ${msg}`),
  ]);
}

