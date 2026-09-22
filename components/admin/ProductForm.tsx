"use client";

import { useActionState, useRef, useState, startTransition } from "react";
import Link from "next/link";
import { saveProduct, type ProductFormState } from "@/app/admin/actions";
import { CATEGORIES } from "@/lib/categories";
import type { CategorySlug, Product } from "@/types/product";
import { adminInput, btnPrimary, btnQuiet } from "./styles";
import DraftPhotos from "./DraftPhotos";
import ProductPreview from "./ProductPreview";

/** Builds the product the preview shows from the form's current values. */
function draftFrom(form: HTMLFormElement | null, base: Product | undefined, photos: string[]): Product {
  const fd = form ? new FormData(form) : null;
  const get = (k: string, fallback = "") => (fd ? String(fd.get(k) ?? "") : fallback).trim();
  const price = get("price", String(base?.price ?? ""));
  const stock = get("stock", String(base?.stock ?? ""));
  const stockN = stock === "" ? 1 : Math.max(0, Math.floor(Number(stock)) || 0);
  return {
    id: base?.id ?? "draft",
    product_code: base?.product_code ?? "OB-…",
    slug: get("slug", base?.slug) || "draft",
    name: get("name", base?.name) || "পণ্যের নাম",
    subtitle: get("subtitle", base?.subtitle ?? "") || null,
    category: (base?.category ?? (get("category") || "sharee")) as CategorySlug,
    description: get("description", base?.description ?? "") || null,
    features: get("features", base?.features.join("\n")).split("\n").map((l) => l.trim()).filter(Boolean),
    specifications: get("specifications", base?.specifications.map((s) => `${s.label}: ${s.value}`).join("\n"))
      .split("\n").map((l) => l.trim()).filter((l) => l.indexOf(":") > 0)
      .map((l) => ({ label: l.slice(0, l.indexOf(":")).trim(), value: l.slice(l.indexOf(":") + 1).trim() })),
    price: price === "" || Number.isNaN(Number(price)) ? null : Number(price),
    stock: stockN,
    available: stockN > 0,
    featured: false,
    images: base
      ? base.images
      : photos.map((image_url, i) => ({ id: image_url, image_url, alt_text: null, sort_order: i })),
    created_at: base?.created_at ?? "",
    updated_at: base?.updated_at ?? "",
  };
}

export default function ProductForm({ product }: { product?: Product }) {
  const [state, formAction, pending] = useActionState<ProductFormState, FormData>(
    saveProduct.bind(null, product?.id ?? null),
    { status: "idle" },
  );
  const e = state.errors ?? {};
  const formRef = useRef<HTMLFormElement>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [draft, setDraft] = useState<Product>(() => draftFrom(null, product, []));
  const refresh = (nextPhotos = photos) => setDraft(draftFrom(formRef.current, product, nextPhotos));
  const previewDialog = useRef<HTMLDialogElement>(null);

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12">
    <form
      ref={formRef}
      onInput={() => refresh()}
      // Submit manually so React doesn't reset the fields on a validation error.
      onSubmit={(ev) => {
        ev.preventDefault();
        const fd = new FormData(ev.currentTarget);
        startTransition(() => formAction(fd));
      }}
      className="grid gap-6"
    >
      {!product && (
        <>
          <DraftPhotos urls={photos} onChange={(u) => { setPhotos(u); refresh(u); }} />
          <input type="hidden" name="images" value={JSON.stringify(photos)} />
        </>
      )}
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="নাম" error={e.name}>
          <input name="name" defaultValue={product?.name} required className={adminInput} aria-invalid={!!e.name} />
        </Field>
        <Field label="Slug (URL)" hint="যেমন saptapadi → /product/saptapadi" error={e.slug}>
          <input name="slug" defaultValue={product?.slug} required pattern="[a-z0-9]+(-[a-z0-9]+)*" className={adminInput} aria-invalid={!!e.slug} />
        </Field>

        <Field label="ক্যাটাগরি" hint={product ? "প্রোডাক্ট কোড তৈরির পর ক্যাটাগরি বদলানো যায় না।" : undefined} error={e.category}>
          {product ? (
            <p className="mt-1 border border-line bg-paper-deep px-3 py-2">
              {CATEGORIES.find((c) => c.slug === product.category)?.label}
            </p>
          ) : (
            <select name="category" required defaultValue="" className={adminInput} aria-invalid={!!e.category}>
              <option value="" disabled>বাছাই করুন</option>
              {CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>{c.label} (OB-{c.codePrefix}-…)</option>
              ))}
            </select>
          )}
        </Field>
        <Field label="প্রোডাক্ট কোড" hint="স্থায়ী — কখনো পরিবর্তন হয় না।">
          <p className="mt-1 border border-line bg-paper-deep px-3 py-2 tabular-nums">
            {product?.product_code ?? <span className="text-ink-soft">সংরক্ষণের সময় স্বয়ংক্রিয়ভাবে তৈরি হবে</span>}
          </p>
        </Field>

        <Field label="সাবটাইটেল" hint="যেমন Sharee + Jewellery Combo">
          <input name="subtitle" defaultValue={product?.subtitle ?? ""} className={adminInput} />
        </Field>
        <Field label="দাম (৳)" hint="পূর্ণ টাকায়। খালি রাখলে “দাম জানতে মেসেজ করুন” দেখাবে।" error={e.price}>
          <input name="price" inputMode="numeric" defaultValue={product?.price ?? ""} className={adminInput} aria-invalid={!!e.price} />
        </Field>
        <Field label="স্টক (কতটি পিস আছে)" hint="প্রতিটি অর্ডারে নিজে থেকে কমবে; 0 হলে সাইটে “Sold out” দেখাবে। অর্ডার বাতিল করলে ফেরত আসবে।" error={e.stock}>
          <input name="stock" type="number" min={0} step={1} inputMode="numeric" required
            defaultValue={product?.stock ?? ""} placeholder="যেমন 5" className={adminInput} aria-invalid={!!e.stock} />
        </Field>
      </div>

      <Field label="বর্ণনা" hint="প্রথম অনুচ্ছেদ উপরে দেখায়। অনুচ্ছেদের মাঝে একটি খালি লাইন দিন।">
        <textarea name="description" rows={5} defaultValue={product?.description ?? ""} className={adminInput} />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="বৈশিষ্ট্য" hint="প্রতি লাইনে একটি।">
          <textarea name="features" rows={7} defaultValue={product?.features.join("\n")} className={adminInput} />
        </Field>
        <Field label="স্পেসিফিকেশন" hint="প্রতি লাইনে Label: Value — যেমন Material: Pure Cotton" error={e.specifications}>
          <textarea
            name="specifications"
            rows={7}
            defaultValue={product?.specifications.map((s) => `${s.label}: ${s.value}`).join("\n")}
            className={adminInput}
            aria-invalid={!!e.specifications}
          />
        </Field>
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="featured" defaultChecked={product?.featured ?? false} className="h-4 w-4 accent-ink" />
          হোমপেজে ফিচার্ড
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-line pt-6">
        <button disabled={pending} className={btnPrimary}>
          {pending ? "সংরক্ষণ হচ্ছে…" : product ? "পরিবর্তন সংরক্ষণ করুন" : "পণ্য তৈরি করুন"}
        </button>
        <button type="button" onClick={() => { refresh(); previewDialog.current?.showModal(); }} className={`${btnQuiet} lg:hidden`}>
          প্রিভিউ দেখুন
        </button>
        <Link href="/admin" className="text-ink-soft underline underline-offset-4">বাতিল</Link>
        {state.message && (
          <p role="status" className={state.status === "error" ? "text-sindoor" : "text-leaf"}>{state.message}</p>
        )}
      </div>
    </form>

    {/* Desktop: live preview beside the form. Phone: the button above opens it full screen. */}
    <aside className="hidden lg:block">
      <div className="sticky top-6">
        <p className="mb-3 text-sm text-ink-soft">লাইভ প্রিভিউ — গ্রাহকরা যেমন দেখবেন</p>
        <ProductPreview product={draft} />
      </div>
    </aside>
    <dialog ref={previewDialog} aria-label="প্রিভিউ"
      onClick={(ev) => { if (ev.target === ev.currentTarget) previewDialog.current?.close(); }}
      className="m-0 h-dvh max-h-none w-full max-w-none bg-paper p-0 backdrop:bg-ink/40 lg:hidden">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-paper px-5 py-3">
        <span className="font-display text-lg">প্রিভিউ</span>
        <button type="button" onClick={() => previewDialog.current?.close()} className={btnQuiet}>বন্ধ করুন</button>
      </div>
      <div className="px-5 py-5"><ProductPreview product={draft} /></div>
    </dialog>
    </div>
  );
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm text-ink-soft">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-sm text-sindoor">{error}</span> : hint && <span className="mt-1 block text-xs text-ink-soft">{hint}</span>}
    </label>
  );
}
