"use client";

import { useActionState, startTransition } from "react";
import Link from "next/link";
import { saveProduct, type ProductFormState } from "@/app/admin/actions";
import { CATEGORIES } from "@/lib/categories";
import type { Product } from "@/types/product";
import { adminInput, btnPrimary } from "./styles";

export default function ProductForm({ product }: { product?: Product }) {
  const [state, formAction, pending] = useActionState<ProductFormState, FormData>(
    saveProduct.bind(null, product?.id ?? null),
    { status: "idle" },
  );
  const e = state.errors ?? {};

  return (
    <form
      // Submit manually so React doesn't reset the fields on a validation error.
      onSubmit={(ev) => {
        ev.preventDefault();
        const fd = new FormData(ev.currentTarget);
        startTransition(() => formAction(fd));
      }}
      className="grid gap-6"
    >
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
        <Link href="/admin" className="text-ink-soft underline underline-offset-4">বাতিল</Link>
        {state.message && (
          <p role="status" className={state.status === "error" ? "text-sindoor" : "text-leaf"}>{state.message}</p>
        )}
      </div>
    </form>
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
