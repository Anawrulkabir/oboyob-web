/**
 * Notifications. Every channel is optional and switched on by env vars.
 * Nothing here ever throws — a failed notification must never fail an order.
 *
 *   Seller:   Telegram (free, instant push)  +  email via Resend (free tier)
 *   Customer: email via Resend (free tier)   +  SMS via any HTTP gateway (paid, optional)
 */
import { site } from "@/lib/site";
import { formatPrice } from "@/lib/format";
import { ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/order-status";

export interface OrderInfo {
  id: string;
  product_code: string;
  product_name: string;
  unit_price: number | null;
  quantity: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_email: string | null;
  note: string | null;
}

const ref = (id: string) => id.slice(0, 8).toUpperCase();
const total = (o: OrderInfo) => (o.unit_price != null ? formatPrice(o.unit_price * o.quantity) : null);
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

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

/**
 * Email: Brevo if BREVO_API_KEY is set (free 300/day, works with a single
 * verified sender address — no domain needed), otherwise Resend (needs a domain).
 */
async function email(to: string, subject: string, html: string) {
  const from = process.env.EMAIL_FROM;
  if (!from || !to) return;
  try {
    let r: Response;
    if (process.env.BREVO_API_KEY) {
      r = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": process.env.BREVO_API_KEY, "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify({ sender: parseFrom(from), to: [{ email: to }], subject, htmlContent: html }),
      });
    } else if (process.env.RESEND_API_KEY) {
      r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to, subject, html }),
      });
    } else return;
    if (!r.ok) console.error("email", r.status, await r.text());
  } catch (e) { console.error("email", e); }
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

function layout(body: string) {
  return `<div style="font-family:'Hind Siliguri',Arial,sans-serif;max-width:520px;margin:0 auto;color:#231f1b;background:#fbf8f2;padding:28px;line-height:1.7">
  <p style="font-size:22px;margin:0 0 18px">${site.nameBn} <span style="color:#6b6157;font-size:14px">${site.nameEn}</span></p>
  ${body}
  <p style="margin-top:28px;font-size:13px;color:#6b6157">প্রশ্ন থাকলে Facebook পেজে মেসেজ করুন: <a href="${site.facebook}" style="color:#a8742a">${site.facebook}</a></p>
</div>`;
}

function orderTable(o: OrderInfo) {
  const row = (k: string, v: string) =>
    `<tr><td style="padding:6px 12px 6px 0;color:#6b6157;vertical-align:top">${k}</td><td style="padding:6px 0">${v}</td></tr>`;
  return `<table style="border-top:1px solid #e3d9c8;border-bottom:1px solid #e3d9c8;width:100%;font-size:15px">
    ${row("পণ্য", `${esc(o.product_name)} (${o.product_code})`)}
    ${row("পরিমাণ", String(o.quantity))}
    ${total(o) ? row("মোট", total(o)!) : ""}
    ${row("নাম", esc(o.customer_name))}
    ${row("ফোন", o.customer_phone)}
    ${row("ঠিকানা", esc(o.customer_address).replace(/\n/g, "<br>"))}
    ${o.note ? row("নোট", esc(o.note)) : ""}
  </table>`;
}

// ------------------------------------------------------------------ events

export async function notifyNewOrder(o: OrderInfo) {
  const admin = `${site.url}/admin/orders`;
  await Promise.all([
    telegram(
      `🛍 <b>নতুন অর্ডার</b> #${ref(o.id)}\n` +
      `${esc(o.product_name)} (${o.product_code}) × ${o.quantity}${total(o) ? ` = ${total(o)}` : ""}\n\n` +
      `👤 ${esc(o.customer_name)}\n📞 ${o.customer_phone}\n📍 ${esc(o.customer_address)}` +
      (o.note ? `\n📝 ${esc(o.note)}` : "") + `\n\n${admin}`,
    ),
    process.env.SELLER_EMAIL &&
      email(process.env.SELLER_EMAIL, `নতুন অর্ডার #${ref(o.id)} — ${o.product_name}`,
        layout(`<p>নতুন অর্ডার এসেছে।</p>${orderTable(o)}<p><a href="${admin}" style="color:#a8742a">অ্যাডমিনে দেখুন</a></p>`)),
    o.customer_email &&
      email(o.customer_email, `আপনার অর্ডার পেয়েছি — #${ref(o.id)}`,
        layout(`<p>প্রিয় ${esc(o.customer_name)},</p>
          <p>অবয়ব-এ অর্ডারের জন্য ধন্যবাদ। কনফার্ম করতে শীঘ্রই আপনাকে ফোন করা হবে।</p>
          ${orderTable(o)}<p style="font-size:13px;color:#6b6157">অর্ডার রেফারেন্স: #${ref(o.id)}</p>`)),
    sms(o.customer_phone, `অবয়ব: আপনার অর্ডার #${ref(o.id)} (${o.product_name}) পেয়েছি। কনফার্ম করতে শীঘ্রই ফোন করা হবে।`),
  ]);
}

const STATUS_MESSAGE: Partial<Record<OrderStatus, string>> = {
  confirmed: "আপনার অর্ডার কনফার্ম হয়েছে। শীঘ্রই পাঠানো হবে।",
  shipped: "আপনার অর্ডার পাঠানো হয়েছে। শীঘ্রই হাতে পাবেন।",
  delivered: "আপনার অর্ডার ডেলিভারি হয়েছে। অবয়ব-এর সাথে থাকার জন্য ধন্যবাদ।",
  cancelled: "আপনার অর্ডার বাতিল করা হয়েছে। কোনো প্রশ্ন থাকলে আমাদের মেসেজ করুন।",
};

export async function notifyStatusChange(o: OrderInfo, status: OrderStatus) {
  const msg = STATUS_MESSAGE[status];
  if (!msg) return;
  await Promise.all([
    o.customer_email &&
      email(o.customer_email, `অর্ডার #${ref(o.id)}: ${ORDER_STATUS_LABEL[status]}`,
        layout(`<p>প্রিয় ${esc(o.customer_name)},</p><p>${msg}</p>${orderTable(o)}
          <p><a href="${site.url}/account" style="color:#a8742a">আপনার অর্ডারগুলো দেখুন</a></p>`)),
    sms(o.customer_phone, `অবয়ব: অর্ডার #${ref(o.id)} — ${msg}`),
  ]);
}
