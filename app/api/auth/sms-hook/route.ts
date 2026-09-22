import { createHmac, timingSafeEqual } from "node:crypto";
import { sendSmsStrict } from "@/lib/notify";
import { normalizeBdPhone } from "@/lib/phone";
import { site } from "@/lib/site";

// Phone login OTPs through your own Bangladeshi SMS gateway (SMS_API_URL),
// instead of Twilio/MessageBird. Supabase → Authentication → Hooks → Send SMS
// → HTTPS → https://<your-site>/api/auth/sms-hook. Put the generated secret
// ("v1,whsec_...") in SUPABASE_SMS_HOOK_SECRET. Signed with Standard Webhooks.

function verify(body: string, h: Headers): boolean {
  const secret = process.env.SUPABASE_SMS_HOOK_SECRET?.replace(/^v1,whsec_/, "");
  const id = h.get("webhook-id"), ts = h.get("webhook-timestamp"), sigs = h.get("webhook-signature");
  if (!secret || !id || !ts || !sigs) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const expected = createHmac("sha256", Buffer.from(secret, "base64")).update(`${id}.${ts}.${body}`).digest();
  return sigs.split(" ").some((s) => {
    const sig = Buffer.from(s.replace(/^v1,/, ""), "base64");
    return sig.length === expected.length && timingSafeEqual(sig, expected);
  });
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

export async function POST(req: Request) {
  const body = await req.text();
  if (!verify(body, req.headers)) return json({ error: { http_code: 401, message: "invalid signature" } }, 401);

  const { user, sms } = JSON.parse(body) as { user: { phone: string }; sms: { otp: string } };
  const phone = normalizeBdPhone(user.phone);
  if (!phone) return json({ error: { http_code: 422, message: "শুধু বাংলাদেশি মোবাইল নম্বর" } }, 422);
  try {
    await sendSmsStrict(phone, `${site.nameBn} লগইন কোড: ${sms.otp}\nএই কোড কাউকে দেবেন না।`);
    return json({});
  } catch (err) {
    console.error("sms hook", err);
    return json({ error: { http_code: 500, message: "SMS পাঠানো যায়নি" } }, 500);
  }
}
