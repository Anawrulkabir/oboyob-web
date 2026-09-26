"use server";

import { after } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getProducts, PRODUCTS_TAG } from "@/lib/products";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createSessionClient } from "@/lib/supabase/session";
import { normalizeBdPhone } from "@/lib/phone";
import { notifyNewOrder } from "@/lib/notify";
import { COUPON_CODE, couponErrorMessage, normalizeCouponCode } from "@/lib/coupon";
import { checkoutZone } from "@/lib/delivery";
import { loadOrder } from "@/lib/orders";

export type CheckoutField = "name" | "phone" | "address" | "email" | "zone" | "coupon";

export interface CheckoutState {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Partial<Record<CheckoutField, string>>;
  /** Cart lines the server had to correct (stock ran out), keyed by product id → pieces left. */
  stock?: Record<string, number>;
  orderId?: string;
  token?: string;
}

interface CartLine { id: string; qty: number }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function parseLines(raw: FormDataEntryValue | null): CartLine[] {
  try {
    const list: unknown = JSON.parse(String(raw ?? "[]"));
    if (!Array.isArray(list)) return [];
    return list
      .map((l) => ({ id: String(l?.id ?? ""), qty: Math.floor(Number(l?.qty)) }))
      .filter((l) => /^[0-9a-f-]{36}$/i.test(l.id) && l.qty >= 1 && l.qty <= 20)
      .slice(0, 20);
  } catch {
    return [];
  }
}

export async function placeOrder(_prev: CheckoutState, form: FormData): Promise<CheckoutState> {
  if (String(form.get("website") ?? "")) return { status: "error", message: "আবার চেষ্টা করুন।" }; // honeypot

  const lines = parseLines(form.get("items"));
  const name = String(form.get("name") ?? "").trim();
  const phone = normalizeBdPhone(String(form.get("phone") ?? ""));
  const address = String(form.get("address") ?? "").trim();
  const note = String(form.get("note") ?? "").trim().slice(0, 1000);
  const emailRaw = String(form.get("email") ?? "").trim().toLowerCase();
  const zone = checkoutZone(String(form.get("zone") ?? ""));
  const coupon = normalizeCouponCode(String(form.get("coupon") ?? ""));

  if (!lines.length) return { status: "error", message: "কার্ট খালি। আগে পণ্য যোগ করুন।" };
  const errors: CheckoutState["errors"] = {};
  if (name.length < 2) errors.name = "আপনার নাম লিখুন।";
  if (!phone) errors.phone = "সঠিক মোবাইল নম্বর লিখুন (যেমন 01712345678)।";
  if (address.length < 8) errors.address = "ডেলিভারির পূর্ণ ঠিকানা লিখুন — এলাকা, থানা ও জেলাসহ।";
  if (emailRaw && !EMAIL.test(emailRaw)) errors.email = "ইমেইলটি সঠিক নয়, অথবা খালি রাখুন।";
  if (!zone) errors.zone = "ডেলিভারি এলাকা বাছাই করুন।";
  if (Object.keys(errors).length) return { status: "error", errors, message: "চিহ্নিত ঘরগুলো ঠিক করুন।" };

  const db = getServiceClient();
  if (!db) return { status: "error", message: "অনলাইন অর্ডার এখনও চালু হয়নি। Facebook পেজে মেসেজ করে অর্ডার করুন।" };

  let userId: string | null = null;
  let userEmail: string | null = null;
  if (isSupabaseConfigured) {
    const { data } = await (await createSessionClient()).auth.getUser();
    userId = data.user?.id ?? null;
    userEmail = data.user?.email || null;
  }

  const customer = {
    name: name.slice(0, 120),
    phone: phone!,
    address: address.slice(0, 500),
    email: emailRaw || userEmail,
  };

  // Prices, stock, coupon, delivery and the order itself are settled in one
  // database transaction (place_cart_order, 0006_cart_checkout.sql).
  const { data: placed, error } = await db.rpc("place_cart_order", {
    p_items: lines.map((l) => ({ product_id: l.id, quantity: l.qty })),
    p_zone: zone!.id,
    p_customer_id: userId,
    p_customer_name: customer.name,
    p_customer_phone: customer.phone,
    p_customer_address: customer.address,
    p_customer_email: customer.email,
    p_note: note || null,
    p_coupon_code: coupon || null,
  });

  if (error || !placed) {
    const msg = error?.message ?? "";
    const couponMsg = couponErrorMessage(msg);
    if (couponMsg) return { status: "error", errors: { coupon: couponMsg }, message: "কুপনটি সরিয়ে বা বদলে আবার চেষ্টা করুন।" };
    const out = msg.match(/OUT_OF_STOCK:([^:]+):(\d+)/);
    if (out) {
      refreshCatalog();
      const product = (await getProducts()).find((p) => p.product_code === out[1]);
      const left = Number(out[2]);
      return {
        status: "error",
        stock: product ? { [product.id]: left } : undefined,
        message: left > 0
          ? `দুঃখিত, “${product?.name ?? out[1]}” মাত্র ${left.toLocaleString("bn-BD")}টি স্টকে আছে। কার্ট ঠিক করে দেওয়া হয়েছে — আবার কনফার্ম করুন।`
          : `দুঃখিত, “${product?.name ?? out[1]}” এইমাত্র বিক্রি শেষ হয়ে গেছে। কার্ট থেকে সরিয়ে দেওয়া হয়েছে।`,
      };
    }
    if (msg.includes("PRICE_MISSING") || msg.includes("PRODUCT_NOT_FOUND"))
      return { status: "error", message: "কার্টের একটি পণ্য এখন অর্ডার করা যাচ্ছে না। কার্ট থেকে সরিয়ে আবার চেষ্টা করুন।" };
    console.error("place_cart_order failed", error);
    return { status: "error", message: "অর্ডার পাঠানো যায়নি। আবার চেষ্টা করুন, অথবা Facebook পেজে মেসেজ করুন।" };
  }

  const orderId = String((placed as { id: string }).id);
  refreshCatalog(); // stock changed — sold-out badges must show right away

  if (userId) {
    await db.from("profiles").update({ full_name: customer.name, phone: customer.phone, address: customer.address }).eq("id", userId);
  }

  after(async () => {
    const order = await loadOrder(db, orderId);
    if (order) await notifyNewOrder(order);
  });

  return { status: "success", orderId, token: String((placed as { slip_token: string }).slip_token) };
}

export interface CouponCheck { ok: boolean; code?: string; discount?: number; message?: string }

/**
 * Checkout "Apply" button: what this code takes off this cart. Doesn't use up
 * the coupon. The phone matters for personal (bargain) coupons.
 */
export async function checkCoupon(rawCode: string, lines: CartLine[], rawPhone: string): Promise<CouponCheck> {
  const code = normalizeCouponCode(rawCode);
  if (!COUPON_CODE.test(code)) return { ok: false, message: "কুপন কোডটি সঠিক নয়।" };
  const db = getServiceClient();
  if (!db) return { ok: false, message: "এখন কুপন যাচাই করা যাচ্ছে না।" };
  const items = lines.slice(0, 20).map((l) => ({ product_id: l.id, quantity: Math.min(20, Math.max(1, Math.floor(l.qty) || 1)) }));
  const { data, error } = await db.rpc("check_coupon", { p_code: code, p_items: items, p_phone: normalizeBdPhone(rawPhone) ?? "" });
  if (error) return { ok: false, message: couponErrorMessage(error.message) ?? "এখন কুপন যাচাই করা যাচ্ছে না।" };
  return { ok: true, code, discount: Number(data) };
}

function refreshCatalog() {
  revalidateTag(PRODUCTS_TAG);
  revalidatePath("/", "layout");
}
