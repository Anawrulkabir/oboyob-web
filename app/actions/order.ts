"use server";

import { after } from "next/server";
import { getProductBySlug } from "@/lib/products";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createSessionClient } from "@/lib/supabase/session";
import { normalizeBdPhone, toAsciiDigits } from "@/lib/phone";
import { notifyNewOrder, type OrderInfo } from "@/lib/notify";

export type OrderField = "name" | "phone" | "address" | "quantity" | "email";

export interface OrderState {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Partial<Record<OrderField, string>>;
  orderRef?: string;
  loggedIn?: boolean;
  emailed?: boolean;
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

  const errors: OrderState["errors"] = {};
  if (name.length < 2) errors.name = "আপনার নাম লিখুন।";
  if (!phone) errors.phone = "সঠিক মোবাইল নম্বর লিখুন (যেমন 01712345678)।";
  if (address.length < 8) errors.address = "ডেলিভারির পূর্ণ ঠিকানা লিখুন — এলাকা, থানা ও জেলাসহ।";
  if (emailRaw && !EMAIL.test(emailRaw)) errors.email = "ইমেইলটি সঠিক নয়, অথবা খালি রাখুন।";
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) errors.quantity = "পরিমাণ ১ থেকে ২০ এর মধ্যে দিন।";
  if (Object.keys(errors).length) return { status: "error", errors, message: "চিহ্নিত ঘরগুলো ঠিক করুন।" };

  const product = await getProductBySlug(slug);
  if (!product) return { status: "error", message: "পণ্যটি পাওয়া যায়নি। পেজটি রিফ্রেশ করে আবার চেষ্টা করুন।" };
  if (!product.available) return { status: "error", message: "পণ্যটি এই মুহূর্তে স্টকে নেই।" };

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
    product_id: product.id,
    product_code: product.product_code,
    product_name: product.name,
    unit_price: product.price,
    quantity,
    customer_id: userId,
    customer_name: name.slice(0, 120),
    customer_phone: phone!,
    customer_address: address.slice(0, 500),
    customer_email: customerEmail,
    note: note || null,
  };

  const { data, error } = await db.from("orders").insert(row).select("id").single();
  if (error || !data) {
    console.error("order insert failed", error);
    return { status: "error", message: "অর্ডার পাঠানো যায়নি। আবার চেষ্টা করুন, অথবা Facebook পেজে মেসেজ করুন।" };
  }

  // Remember delivery details on the account for next time.
  if (userId) {
    await db.from("profiles").update({ full_name: row.customer_name, phone: row.customer_phone, address: row.customer_address }).eq("id", userId);
  }

  // Notifications run after the response is sent — the customer never waits on them.
  const info: OrderInfo = { id: data.id, ...row };
  after(() => notifyNewOrder(info));

  return {
    status: "success",
    orderRef: String(data.id).slice(0, 8).toUpperCase(),
    loggedIn: !!userId,
    emailed: !!customerEmail && !!process.env.RESEND_API_KEY,
    message: "আপনার অর্ডার পেয়েছি।",
  };
}
