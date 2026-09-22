"use server";

import { after } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getProductBySlug, PRODUCTS_TAG } from "@/lib/products";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createSessionClient } from "@/lib/supabase/session";
import { normalizeBdPhone, toAsciiDigits } from "@/lib/phone";
import { notifyNewOrder, type OrderInfo } from "@/lib/notify";
import { COUPON_CODE, couponErrorMessage, normalizeCouponCode } from "@/lib/coupon";

export type OrderField = "name" | "phone" | "address" | "quantity" | "email" | "coupon";

export interface OrderState {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Partial<Record<OrderField, string>>;
  orderRef?: string;
  loggedIn?: boolean;
  emailed?: boolean;
  /** Final amounts for the confirmation screen. */
  discount?: number;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function submitOrder(_prev: OrderState, form: FormData): Promise<OrderState> {
  if (String(form.get("website") ?? "")) return { status: "success", message: "ধন্যবাদ!" }; // honeypot

  const slug = String(form.get("slug") ?? "");
  const name = String(form.get("name") ?? "").trim();
  const phone = normalizeBdPhone(String(form.get("phone") ?? ""));
  const address = String(form.get("address") ?? "").trim();
  const note = String(form.get("note") ?? "").trim().slice(0, 1000);
  const emailRaw = String(form.get("email") ?? "").trim().toLowerCase();
  const quantity = Number.parseInt(toAsciiDigits(String(form.get("quantity") ?? "1")), 10);
  const coupon = normalizeCouponCode(String(form.get("coupon") ?? ""));

  const errors: OrderState["errors"] = {};
  if (name.length < 2) errors.name = "আপনার নাম লিখুন।";
  if (!phone) errors.phone = "সঠিক মোবাইল নম্বর লিখুন (যেমন 01712345678)।";
  if (address.length < 8) errors.address = "ডেলিভারির পূর্ণ ঠিকানা লিখুন — এলাকা, থানা ও জেলাসহ।";
  if (emailRaw && !EMAIL.test(emailRaw)) errors.email = "ইমেইলটি সঠিক নয়, অথবা খালি রাখুন।";
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) errors.quantity = "পরিমাণ ১ থেকে ২০ এর মধ্যে দিন।";
  if (Object.keys(errors).length) return { status: "error", errors, message: "চিহ্নিত ঘরগুলো ঠিক করুন।" };

  const product = await getProductBySlug(slug);
  if (!product) return { status: "error", message: "পণ্যটি পাওয়া যায়নি। পেজটি রিফ্রেশ করে আবার চেষ্টা করুন।" };
  if (!product.available) return { status: "error", message: "দুঃখিত, পণ্যটি বিক্রি শেষ (Sold out)।" };

  const db = getServiceClient();
  if (!db) return { status: "error", message: "অনলাইন অর্ডার এখনও চালু হয়নি। Facebook পেজে মেসেজ করে অর্ডার করুন।" };

  // Attach to the customer's account if they're signed in.
  let userId: string | null = null;
  let userEmail: string | null = null;
  if (isSupabaseConfigured) {
    const { data } = await (await createSessionClient()).auth.getUser();
    userId = data.user?.id ?? null;
    userEmail = data.user?.email || null;
  }
  const customerEmail = emailRaw || userEmail;

  const row = {
    customer_name: name.slice(0, 120),
    customer_phone: phone!,
    customer_address: address.slice(0, 500),
    customer_email: customerEmail,
    note: note || null,
  };

  // Stock is taken and the order inserted in one database transaction (0004_stock.sql).
  const { data: order, error } = await db.rpc("place_order", {
    p_product_id: product.id,
    p_quantity: quantity,
    p_customer_id: userId,
    p_customer_name: row.customer_name,
    p_customer_phone: row.customer_phone,
    p_customer_address: row.customer_address,
    p_customer_email: row.customer_email,
    p_note: row.note,
    p_coupon_code: coupon || null,
  });
  if (error || !order) {
    const couponMsg = couponErrorMessage(error?.message);
    if (couponMsg) return { status: "error", errors: { coupon: couponMsg }, message: "কুপনটি সরিয়ে বা বদলে আবার চেষ্টা করুন।" };
    const left = error?.message.match(/OUT_OF_STOCK:(\d+)/)?.[1];
    if (left !== undefined) {
      refreshCatalog();
      const n = Number(left);
      return n > 0
        ? { status: "error", errors: { quantity: `মাত্র ${n.toLocaleString("bn-BD")}টি স্টকে আছে।` }, message: "পরিমাণ কমিয়ে আবার চেষ্টা করুন।" }
        : { status: "error", message: "দুঃখিত, পণ্যটি এইমাত্র বিক্রি শেষ (Sold out) হয়ে গেছে।" };
    }
    console.error("place_order failed", error);
    return { status: "error", message: "অর্ডার পাঠানো যায়নি। আবার চেষ্টা করুন, অথবা Facebook পেজে মেসেজ করুন।" };
  }
  const data = order as OrderInfo;
  refreshCatalog(); // stock changed — sold-out badges must show right away

  // Remember delivery details on the account for next time.
  if (userId) {
    await db.from("profiles").update({ full_name: row.customer_name, phone: row.customer_phone, address: row.customer_address }).eq("id", userId);
  }

  // Notifications run after the response is sent — the customer never waits on them.
  after(() => notifyNewOrder(data));

  return {
    status: "success",
    orderRef: String(data.id).slice(0, 8).toUpperCase(),
    loggedIn: !!userId,
    emailed: !!customerEmail && !!process.env.RESEND_API_KEY,
    discount: data.discount ?? 0,
    message: "আপনার অর্ডার পেয়েছি।",
  };
}

export interface CouponCheck { ok: boolean; code?: string; discount?: number; message?: string }

/** Order form "Apply" button: what this code takes off this order. Doesn't use up the coupon. */
export async function checkCoupon(slug: string, rawCode: string, quantity: number): Promise<CouponCheck> {
  const code = normalizeCouponCode(rawCode);
  if (!COUPON_CODE.test(code)) return { ok: false, message: "কুপন কোডটি সঠিক নয়।" };
  const qty = Math.min(20, Math.max(1, Math.floor(quantity) || 1));
  const product = await getProductBySlug(slug);
  const db = getServiceClient();
  if (!product || !db) return { ok: false, message: "এখন কুপন যাচাই করা যাচ্ছে না।" };
  const { data, error } = await db.rpc("check_coupon", { p_code: code, p_product_id: product.id, p_quantity: qty });
  if (error) return { ok: false, message: couponErrorMessage(error.message) ?? "এখন কুপন যাচাই করা যাচ্ছে না।" };
  return { ok: true, code, discount: Number(data) };
}

function refreshCatalog() {
  revalidateTag(PRODUCTS_TAG);
  revalidatePath("/", "layout");
}
