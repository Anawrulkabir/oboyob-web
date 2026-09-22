"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/session";
import { normalizeBdPhone, toE164, toAsciiDigits } from "@/lib/phone";
import { site } from "@/lib/site";

export interface AuthState {
  step: "start" | "code" | "error";
  method?: "email" | "phone";
  target?: string;   // email or local phone the code was sent to
  message?: string;
}

/** Only allow same-site relative redirects. */
const safeNext = (n: unknown) => {
  const s = String(n ?? "");
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/admin") ? s : "/account";
};

export async function sendCode(_prev: AuthState, form: FormData): Promise<AuthState> {
  const method = form.get("method") === "phone" ? "phone" : "email";
  const sb = await createSessionClient();

  if (method === "email") {
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { step: "error", method, message: "সঠিক ইমেইল লিখুন।" };
    const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    if (error) return { step: "error", method, message: rateMsg(error.message) };
    return { step: "code", method, target: email };
  }

  const phone = normalizeBdPhone(String(form.get("phone") ?? ""));
  if (!phone) return { step: "error", method, message: "সঠিক মোবাইল নম্বর লিখুন (যেমন 01712345678)।" };
  const { error } = await sb.auth.signInWithOtp({ phone: toE164(phone) });
  if (error) return { step: "error", method, message: rateMsg(error.message) };
  return { step: "code", method, target: phone };
}

export async function verifyCode(_prev: AuthState, form: FormData): Promise<AuthState> {
  const method = form.get("method") === "phone" ? "phone" : "email";
  const target = String(form.get("target") ?? "");
  const token = toAsciiDigits(String(form.get("code") ?? "")).replace(/\D/g, "");
  const sb = await createSessionClient();

  const { error } =
    method === "email"
      ? await sb.auth.verifyOtp({ email: target, token, type: "email" })
      : await sb.auth.verifyOtp({ phone: toE164(target), token, type: "sms" });

  if (error) return { step: "code", method, target, message: "কোডটি সঠিক নয় বা মেয়াদ শেষ। আবার চেষ্টা করুন।" };
  redirect(safeNext(form.get("next")));
}

const OAUTH_PROVIDERS = ["google", "facebook"] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

/** Google / Facebook via Supabase's built-in OAuth providers. */
export async function signInWithOAuth(form: FormData) {
  const provider = OAUTH_PROVIDERS.find((p) => p === form.get("provider"));
  const next = safeNext(form.get("next"));
  if (!provider) redirect(`/login?next=${encodeURIComponent(next)}`);
  const sb = await createSessionClient();
  const origin = (await headers()).get("origin") ?? site.url;
  const { data, error } = await sb.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback?provider=${provider}&next=${encodeURIComponent(next)}`,
      ...(provider === "facebook"
        ? { scopes: "email" }
        : { queryParams: { prompt: "select_account" } }), // let shared-phone users pick their Google account
    },
  });
  if (error || !data.url) redirect(`/login?error=${provider}&next=${encodeURIComponent(next)}`);
  redirect(data.url);
}

export async function signOutCustomer() {
  await (await createSessionClient()).auth.signOut();
  redirect("/");
}

export interface ProfileState { status: "idle" | "saved" | "error"; message?: string }

export async function saveProfile(_prev: ProfileState, form: FormData): Promise<ProfileState> {
  const sb = await createSessionClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login?next=/account");
  const phoneRaw = String(form.get("phone") ?? "").trim();
  const phone = phoneRaw ? normalizeBdPhone(phoneRaw) : null;
  if (phoneRaw && !phone) return { status: "error", message: "মোবাইল নম্বরটি সঠিক নয়।" };
  const { error } = await sb.from("profiles").update({
    full_name: String(form.get("full_name") ?? "").trim() || null,
    phone,
    address: String(form.get("address") ?? "").trim() || null,
  }).eq("id", user.id);
  if (error) return { status: "error", message: "সংরক্ষণ হয়নি। আবার চেষ্টা করুন।" };
  return { status: "saved", message: "সংরক্ষিত হয়েছে।" };
}

function rateMsg(m: string) {
  return /rate|seconds|too many/i.test(m)
    ? "অনেকবার চেষ্টা হয়েছে। এক মিনিট পর আবার চেষ্টা করুন।"
    : "কোড পাঠানো যায়নি। একটু পরে আবার চেষ্টা করুন।";
}

/** Single entry point for the login panel: intent = send | verify. */
export async function authFlow(prev: AuthState, form: FormData): Promise<AuthState> {
  return form.get("intent") === "verify" ? verifyCode(prev, form) : sendCode(prev, form);
}
