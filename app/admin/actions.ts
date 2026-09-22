"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { notifyStatusChange, type OrderInfo } from "@/lib/notify";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createSessionClient } from "@/lib/supabase/session";
import { getCategory } from "@/lib/categories";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/order-status";
import type { ProductSpec } from "@/types/product";

const refreshSite = () => revalidatePath("/", "layout");

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
  errors?: Partial<Record<"name" | "slug" | "category" | "price" | "specifications", string>>;
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

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
  const slug = String(form.get("slug") ?? "").trim().toLowerCase();
  const category = String(form.get("category") ?? "");
  const priceRaw = String(form.get("price") ?? "").trim();
  const specs = parseSpecs(String(form.get("specifications") ?? ""));

  const errors: ProductFormState["errors"] = {};
  if (!name) errors.name = "নাম দিন।";
  if (!SLUG.test(slug)) errors.slug = "শুধু ছোট হাতের ইংরেজি অক্ষর, সংখ্যা ও হাইফেন (যেমন saptapadi)।";
  if (!id && !getCategory(category)) errors.category = "ক্যাটাগরি বাছাই করুন।";
  const price = priceRaw === "" ? null : Number(priceRaw);
  if (price !== null && (!Number.isInteger(price) || price < 0)) errors.price = "পূর্ণ টাকায় লিখুন (যেমন 1250), অথবা খালি রাখুন।";
  if (!specs) errors.specifications = "প্রতি লাইনে Label: Value ফরম্যাটে লিখুন।";
  if (Object.keys(errors).length) return { status: "error", errors, message: "চিহ্নিত ঘরগুলো ঠিক করুন।" };

  const row = {
    name,
    slug,
    subtitle: String(form.get("subtitle") ?? "").trim() || null,
    description: String(form.get("description") ?? "").trim() || null,
    features: String(form.get("features") ?? "").split("\n").map((l) => l.trim()).filter(Boolean),
    specifications: specs,
    price,
    available: form.get("available") === "on",
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
  refreshSite();
  redirect(`/admin/products/${data.id}?created=1`);
}

function dbError(error: { code?: string; message?: string } | null): ProductFormState {
  if (error?.code === "23505" && error.message?.includes("slug"))
    return { status: "error", errors: { slug: "এই slug আগে থেকেই ব্যবহৃত।" }, message: "Slug পরিবর্তন করুন।" };
  console.error(error);
  return { status: "error", message: `সংরক্ষণ হয়নি: ${error?.message ?? "অজানা ত্রুটি"}` };
}

export async function setProductFlag(id: string, field: "available" | "featured" | "archived", value: boolean) {
  const { sb } = await requireAdmin();
  const patch = field === "archived" && value ? { archived: true, featured: false } : { [field]: value };
  const { error } = await sb.from("products").update(patch).eq("id", id);
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
export async function setOrderStatus(orderId: string, form: FormData) {
  const { sb } = await requireAdmin();
  const status = String(form.get("status"));
  if (!(ORDER_STATUSES as readonly string[]).includes(status)) return;
  const { data: before } = await sb.from("orders").select("status").eq("id", orderId).single();
  const { data: order, error } = await sb.from("orders").update({ status }).eq("id", orderId).select("*").single();
  if (error || !order) throw new Error(error?.message ?? "update failed");
  revalidatePath("/admin/orders");
  // Tell the customer (email/SMS if configured) — only when the status actually changed.
  if (before?.status !== status) after(() => notifyStatusChange(order as OrderInfo, status as OrderStatus));
}
