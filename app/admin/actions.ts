"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { after } from "next/server";
import { emailHtml, notifyStatusChange, sendEmail, slipUrl } from "@/lib/notify";
import { loadOrder, orderRef } from "@/lib/orders";
import { renderSlipPdf } from "@/lib/slip-pdf";
import { announceProduct } from "@/lib/announce";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createSessionClient } from "@/lib/supabase/session";
import { getCategory } from "@/lib/categories";
import { PRODUCTS_TAG } from "@/lib/products";
import { COUPON_CODE, normalizeCouponCode } from "@/lib/coupon";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/order-status";
import type { ProductSpec } from "@/types/product";

const refreshSite = () => {
  revalidateTag(PRODUCTS_TAG);
  revalidatePath("/", "layout");
};

// ------------------------------------------------------------------ auth
export interface LoginState { error?: string }

export async function signIn(_prev: LoginState, form: FormData): Promise<LoginState> {
  const sb = await createSessionClient();
  const { data, error } = await sb.auth.signInWithPassword({
    email: String(form.get("email") ?? "").trim(),
    password: String(form.get("password") ?? ""),
  });
  if (error || !data.user) return { error: "ইমেইল বা পাসওয়ার্ড সঠিক নয়।" };
  const { data: admin } = await sb.from("admins").select("user_id").eq("user_id", data.user.id).maybeSingle();
  if (!admin) {
    await sb.auth.signOut();
    return { error: "এই অ্যাকাউন্টের অ্যাডমিন অ্যাক্সেস নেই।" };
  }
  redirect("/admin");
}

export async function signOut() {
  const sb = await createSessionClient();
  await sb.auth.signOut();
  redirect("/admin/login");
}

// --------------------------------------------------------------- products
export interface ProductFormState {
  status: "idle" | "saved" | "error";
  message?: string;
  errors?: Partial<Record<"name" | "category" | "price" | "stock" | "specifications", string>>;
}

function parseSpecs(raw: string): ProductSpec[] | null {
  const specs: ProductSpec[] = [];
  for (const line of raw.split("\n").map((l) => l.trim()).filter(Boolean)) {
    const i = line.indexOf(":");
    if (i < 1) return null;
    specs.push({ label: line.slice(0, i).trim(), value: line.slice(i + 1).trim() });
  }
  return specs;
}

/** Create (id = null) or update (id bound). */
export async function saveProduct(id: string | null, _prev: ProductFormState, form: FormData): Promise<ProductFormState> {
  const { sb } = await requireAdmin();

  const name = String(form.get("name") ?? "").trim();
  const category = String(form.get("category") ?? "");
  const priceRaw = String(form.get("price") ?? "").trim();
  const stockRaw = String(form.get("stock") ?? "").trim();
  const specs = parseSpecs(String(form.get("specifications") ?? ""));

  const errors: ProductFormState["errors"] = {};
  if (!name) errors.name = "নাম দিন।";
  if (!id && !getCategory(category)) errors.category = "ক্যাটাগরি বাছাই করুন।";
  const price = priceRaw === "" ? null : Number(priceRaw);
  if (price !== null && (!Number.isInteger(price) || price < 0)) errors.price = "পূর্ণ টাকায় লিখুন (যেমন 1250), অথবা খালি রাখুন।";
  const stock = Number(stockRaw);
  if (stockRaw === "" || !Number.isInteger(stock) || stock < 0 || stock > 100000)
    errors.stock = "কতটি পিস আছে লিখুন (যেমন 5)। শেষ হলে 0।";
  if (!specs) errors.specifications = "প্রতি লাইনে Label: Value ফরম্যাটে লিখুন।";
  if (Object.keys(errors).length) return { status: "error", errors, message: "চিহ্নিত ঘরগুলো ঠিক করুন।" };

  const row = {
    name,
    // slug (the /product/… URL) is set by the database from the product code and never changes.
    subtitle: String(form.get("subtitle") ?? "").trim() || null,
    description: String(form.get("description") ?? "").trim() || null,
    features: String(form.get("features") ?? "").split("\n").map((l) => l.trim()).filter(Boolean),
    specifications: specs,
    price,
    stock, // available (in stock / sold out) is derived from this in the database
    featured: form.get("featured") === "on",
  };

  if (id) {
    const { error } = await sb.from("products").update(row).eq("id", id);
    if (error) return dbError(error);
    refreshSite();
    return { status: "saved", message: "সংরক্ষিত হয়েছে।" };
  }

  // product_code is assigned by the database trigger (next OB-X-NNN for the category).
  const { data, error } = await sb.from("products").insert({ ...row, category }).select("id").single();
  if (error || !data) return dbError(error);

  // "Email past customers about it" (create form) — sent after the page responds.
  if (form.get("announce") === "on" && row.stock > 0) {
    const productId = data.id as string;
    after(async () => {
      const r = await announceProduct(productId);
      if (!r.ok) console.error("announce", productId, r.error);
    });
  }

  // Photos picked on the create form were already uploaded to Storage by the browser.
  const images = parseImageUrls(form.get("images"));
  if (images.length) {
    const { error: imgErr } = await sb.from("product_images").insert(
      images.map((image_url, i) => ({ product_id: data.id, image_url, alt_text: name, sort_order: i })),
    );
    if (imgErr) console.error("product images", imgErr);
  }
  refreshSite();
  redirect(`/admin/products/${data.id}?created=1`);
}

function dbError(error: { code?: string; message?: string } | null): ProductFormState {
  console.error(error);
  return { status: "error", message: `সংরক্ষণ হয়নি: ${error?.message ?? "অজানা ত্রুটি"}` };
}

export async function setProductFlag(id: string, field: "featured" | "archived", value: boolean) {
  const { sb } = await requireAdmin();
  const patch = field === "archived" && value ? { archived: true, featured: false } : { [field]: value };
  const { error } = await sb.from("products").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  refreshSite();
}

export interface AnnounceState { status: "idle" | "sent" | "error"; message?: string }

/** Product page "email past customers" button. */
export async function announceProductAction(id: string, _prev: AnnounceState): Promise<AnnounceState> {
  await requireAdmin();
  const r = await announceProduct(id);
  revalidatePath(`/admin/products/${id}`);
  if (!r.ok) return { status: "error", message: r.error };
  return {
    status: "sent",
    message: `${r.sent.toLocaleString("bn-BD")} জনকে পাঠানো হয়েছে` +
      (r.failed ? `, ${r.failed.toLocaleString("bn-BD")}টি যায়নি` : "") +
      (r.skipped ? ` (দৈনিক সীমার কারণে ${r.skipped.toLocaleString("bn-BD")} জন বাকি)` : "") + "।",
  };
}

/** Quick stock update from the product list. */
export async function setProductStock(id: string, form: FormData) {
  const { sb } = await requireAdmin();
  const stock = Number(String(form.get("stock") ?? "").trim());
  if (!Number.isInteger(stock) || stock < 0 || stock > 100000) return;
  const { error } = await sb.from("products").update({ stock }).eq("id", id);
  if (error) throw new Error(error.message);
  refreshSite();
}

/** Permanent delete — only works on archived products. Orders keep their snapshot. */
export async function deleteProductPermanently(id: string) {
  const { sb } = await requireAdmin();
  const { data: imgs } = await sb.from("product_images").select("image_url").eq("product_id", id);
  const paths = (imgs ?? []).map((i) => storagePath(i.image_url)).filter((p): p is string => !!p);
  const { error } = await sb.from("products").delete().eq("id", id).eq("archived", true);
  if (error) throw new Error(error.message);
  if (paths.length) await sb.storage.from("products").remove(paths);
  refreshSite();
  redirect("/admin?show=archived");
}

// ----------------------------------------------------------------- images
const BUCKET_MARKER = "/storage/v1/object/public/products/";
function storagePath(url: string): string | null {
  const i = url.indexOf(BUCKET_MARKER);
  return i === -1 ? null : decodeURIComponent(url.slice(i + BUCKET_MARKER.length));
}

function parseImageUrls(raw: FormDataEntryValue | null): string[] {
  try {
    const list: unknown = JSON.parse(String(raw ?? "[]"));
    return Array.isArray(list) ? list.filter((u): u is string => typeof u === "string" && u.includes(BUCKET_MARKER)).slice(0, 20) : [];
  } catch {
    return [];
  }
}

/** Removes a photo that was uploaded on the create form but taken off before saving. */
export async function discardUpload(imageUrl: string) {
  const { sb } = await requireAdmin();
  const path = storagePath(imageUrl);
  if (path?.startsWith("drafts/")) await sb.storage.from("products").remove([path]);
}

/** Registers an image the browser has already uploaded to Storage. */
export async function addImage(productId: string, imageUrl: string, altText: string) {
  const { sb } = await requireAdmin();
  if (!imageUrl.includes(BUCKET_MARKER)) throw new Error("invalid image url");
  const { data: last } = await sb.from("product_images").select("sort_order")
    .eq("product_id", productId).order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const { error } = await sb.from("product_images").insert({
    product_id: productId, image_url: imageUrl, alt_text: altText || null, sort_order: (last?.sort_order ?? -1) + 1,
  });
  if (error) throw new Error(error.message);
  refreshSite();
}

export async function deleteImage(imageId: string) {
  const { sb } = await requireAdmin();
  const { data: img } = await sb.from("product_images").select("image_url").eq("id", imageId).single();
  const { error } = await sb.from("product_images").delete().eq("id", imageId);
  if (error) throw new Error(error.message);
  const path = img && storagePath(img.image_url);
  if (path) await sb.storage.from("products").remove([path]);
  refreshSite();
}

/** Move an image to the front, up or down. Rewrites sort_order as 0..n. */
export async function moveImage(productId: string, imageId: string, to: "first" | "up" | "down") {
  const { sb } = await requireAdmin();
  const { data } = await sb.from("product_images").select("id").eq("product_id", productId).order("sort_order");
  const ids = (data ?? []).map((r) => r.id as string);
  const i = ids.indexOf(imageId);
  if (i === -1) return;
  ids.splice(i, 1);
  const j = to === "first" ? 0 : to === "up" ? Math.max(0, i - 1) : Math.min(ids.length, i + 1);
  ids.splice(j, 0, imageId);
  await Promise.all(ids.map((id, n) => sb.from("product_images").update({ sort_order: n }).eq("id", id)));
  refreshSite();
}

export async function updateAltText(imageId: string, form: FormData) {
  const { sb } = await requireAdmin();
  await sb.from("product_images").update({ alt_text: String(form.get("alt") ?? "").trim() || null }).eq("id", imageId);
  refreshSite();
}

// ----------------------------------------------------------------- orders
/** `back` = where to return: the orders list or the order's own page. */
export async function setOrderStatus(orderId: string, back: "list" | "detail", form: FormData) {
  const { sb } = await requireAdmin();
  const status = String(form.get("status"));
  if (!(ORDER_STATUSES as readonly string[]).includes(status)) return;
  const here = back === "detail" ? `/admin/orders/${orderId}` : "/admin/orders";
  const { data: before } = await sb.from("orders").select("status").eq("id", orderId).single();
  // Cancelling puts the pieces back in stock (orders_restock trigger).
  const { error } = await sb.from("orders").update({ status }).eq("id", orderId);
  if (error?.message.includes("OUT_OF_STOCK")) redirect(`${here}?error=restock`);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/orders", "layout");
  const changed = before?.status !== status;
  if (changed && (status === "cancelled" || before?.status === "cancelled")) refreshSite();
  if (changed) {
    const order = await loadOrder(sb, orderId);
    // Shipped / delivered / cancelled go out automatically (email + SMS if set up).
    if (order) after(() => notifyStatusChange(order, status as OrderStatus));
  }
  // Confirming opens the order with the email composer, slip attached.
  if (changed && status === "confirmed") redirect(`/admin/orders/${orderId}?compose=1`);
}

export interface EmailState { status: "idle" | "sent" | "error"; message?: string }

/** The "Send email" button: the admin's own message, with the payment slip PDF attached. */
export async function sendOrderEmail(orderId: string, _prev: EmailState, form: FormData): Promise<EmailState> {
  const { sb } = await requireAdmin();
  const order = await loadOrder(sb, orderId);
  if (!order) return { status: "error", message: "Order not found." };
  const to = String(form.get("to") ?? "").trim();
  const subject = String(form.get("subject") ?? "").trim();
  const message = String(form.get("message") ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to)) return { status: "error", message: "Enter a valid email address." };
  if (!subject || !message) return { status: "error", message: "Subject and message can't be empty." };

  const attach = form.get("attach") === "on";
  const attachments = [];
  if (attach) {
    try {
      attachments.push({ filename: `zeenah-slip-${orderRef(order.id)}.pdf`, content: await renderSlipPdf(order) });
    } catch (e) {
      console.error("slip pdf", order.id, e);
      return { status: "error", message: "Couldn't create the PDF slip, so nothing was sent. Untick “Attach payment slip” to send without it, or try again." };
    }
  }
  const html = emailHtml(message, order,
    `<p style="margin-top:18px"><a href="${slipUrl(order)}" style="display:inline-block;background:#231f1b;color:#fbf8f2;padding:10px 18px;text-decoration:none">View payment slip online</a></p>`);
  const r = await sendEmail(to, subject, html, attachments);
  if (!r.ok) return { status: "error", message: r.error };

  await sb.from("orders").update({ emailed_at: new Date().toISOString() }).eq("id", orderId);
  revalidatePath(`/admin/orders/${orderId}`);
  return { status: "sent", message: `Sent to ${to}${attach ? " with the payment slip attached" : ""}.` };
}

// ---------------------------------------------------------------- coupons
export interface CouponFormState {
  status: "idle" | "saved" | "error";
  message?: string;
  errors?: Partial<Record<"code" | "value" | "min_order" | "max_discount" | "usage_limit" | "expires_at", string>>;
}

const optionalInt = (raw: FormDataEntryValue | null) => {
  const s = String(raw ?? "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isInteger(n) && n >= 0 ? n : NaN;
};

export async function createCoupon(_prev: CouponFormState, form: FormData): Promise<CouponFormState> {
  const { sb } = await requireAdmin();
  const code = normalizeCouponCode(String(form.get("code") ?? ""));
  const kind = form.get("kind") === "fixed" ? "fixed" : "percent";
  const value = optionalInt(form.get("value"));
  const min_order = optionalInt(form.get("min_order"));
  const max_discount = kind === "percent" ? optionalInt(form.get("max_discount")) : null;
  const usage_limit = optionalInt(form.get("usage_limit"));
  const expiresRaw = String(form.get("expires_at") ?? "").trim(); // yyyy-mm-dd, Dhaka time
  const expires_at = expiresRaw ? new Date(`${expiresRaw}T23:59:59+06:00`) : null;

  const errors: CouponFormState["errors"] = {};
  if (!COUPON_CODE.test(code)) errors.code = "৩–৩০ অক্ষর: ইংরেজি অক্ষর, সংখ্যা, - বা _ (যেমন EID10)।";
  if (value == null || Number.isNaN(value) || value < 1 || (kind === "percent" && value > 100))
    errors.value = kind === "percent" ? "১ থেকে ১০০ এর মধ্যে % দিন।" : "কত টাকা ছাড় লিখুন।";
  if (Number.isNaN(min_order)) errors.min_order = "পূর্ণ টাকায় লিখুন, অথবা খালি রাখুন।";
  if (Number.isNaN(max_discount) || max_discount === 0) errors.max_discount = "পূর্ণ টাকায় লিখুন, অথবা খালি রাখুন।";
  if (Number.isNaN(usage_limit) || usage_limit === 0) errors.usage_limit = "কতবার ব্যবহার করা যাবে লিখুন, অথবা খালি রাখুন।";
  if (expires_at && (Number.isNaN(expires_at.getTime()) || expires_at < new Date())) errors.expires_at = "আজ বা পরের কোনো তারিখ দিন।";
  if (Object.keys(errors).length) return { status: "error", errors, message: "চিহ্নিত ঘরগুলো ঠিক করুন।" };

  const { error } = await sb.from("coupons").insert({
    code, kind, value, min_order, max_discount, usage_limit, expires_at: expires_at?.toISOString() ?? null,
  });
  if (error?.code === "23505") return { status: "error", errors: { code: "এই কোড আগে থেকেই আছে।" }, message: "অন্য কোড দিন।" };
  if (error) return { status: "error", message: `সংরক্ষণ হয়নি: ${error.message}` };
  revalidatePath("/admin/coupons");
  return { status: "saved", message: `কুপন ${code} তৈরি হয়েছে।` };
}

export async function setCouponActive(code: string, active: boolean) {
  const { sb } = await requireAdmin();
  const { error } = await sb.from("coupons").update({ active }).eq("code", code);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/coupons");
}

/** Past orders keep the code and discount they were placed with. */
export async function deleteCoupon(code: string) {
  const { sb } = await requireAdmin();
  const { error } = await sb.from("coupons").delete().eq("code", code);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/coupons");
}
