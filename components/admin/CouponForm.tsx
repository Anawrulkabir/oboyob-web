"use client";

import { useActionState, useRef, useState, startTransition, useEffect } from "react";
import { createCoupon, type CouponFormState } from "@/app/admin/actions";
import { adminInput, btnPrimary } from "./styles";

export default function CouponForm() {
  const [state, action, pending] = useActionState<CouponFormState, FormData>(createCoupon, { status: "idle" });
  const [kind, setKind] = useState<"percent" | "fixed">("percent");
  const formRef = useRef<HTMLFormElement>(null);
  const e = state.errors ?? {};
  useEffect(() => { if (state.status === "saved") { formRef.current?.reset(); setKind("percent"); } }, [state]);

  return (
    <form
      ref={formRef}
      onSubmit={(ev) => { ev.preventDefault(); const fd = new FormData(ev.currentTarget); startTransition(() => action(fd)); }}
      className="grid gap-5 border border-line p-5 sm:grid-cols-2 lg:grid-cols-3"
    >
      <Field label="কুপন কোড" hint="গ্রাহক যা লিখবেন, যেমন EID10" error={e.code}>
        <input name="code" required autoCapitalize="characters" autoComplete="off" spellCheck={false}
          onChange={(ev) => { ev.target.value = ev.target.value.toUpperCase(); }}
          className={`${adminInput} uppercase tracking-wider`} aria-invalid={!!e.code} />
      </Field>

      <div>
        <span className="text-sm text-ink-soft">ছাড়ের ধরন</span>
        <div className="mt-1 grid grid-cols-2 border border-line text-sm">
          {([["percent", "% ছাড়"], ["fixed", "৳ টাকা ছাড়"]] as const).map(([k, label]) => (
            <label key={k} className={`cursor-pointer py-2 text-center ${kind === k ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"}`}>
              <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="sr-only" />
              {label}
            </label>
          ))}
        </div>
      </div>

      <Field label={kind === "percent" ? "কত % ছাড়" : "কত টাকা ছাড় (৳)"} error={e.value}>
        <input name="value" type="number" min={1} max={kind === "percent" ? 100 : undefined} required inputMode="numeric"
          placeholder={kind === "percent" ? "যেমন 10" : "যেমন 200"} className={adminInput} aria-invalid={!!e.value} />
      </Field>

      <Field label="সর্বনিম্ন অর্ডার (৳)" hint="ঐচ্ছিক — এর কম হলে কুপন চলবে না" error={e.min_order}>
        <input name="min_order" type="number" min={0} inputMode="numeric" className={adminInput} aria-invalid={!!e.min_order} />
      </Field>

      {kind === "percent" && (
        <Field label="সর্বোচ্চ ছাড় (৳)" hint="ঐচ্ছিক — যেমন 10% কিন্তু ৳৩০০-এর বেশি না" error={e.max_discount}>
          <input name="max_discount" type="number" min={1} inputMode="numeric" className={adminInput} aria-invalid={!!e.max_discount} />
        </Field>
      )}

      <Field label="কতবার ব্যবহার করা যাবে" hint="ঐচ্ছিক — খালি রাখলে সীমাহীন" error={e.usage_limit}>
        <input name="usage_limit" type="number" min={1} inputMode="numeric" className={adminInput} aria-invalid={!!e.usage_limit} />
      </Field>

      <Field label="মেয়াদ শেষ" hint="ঐচ্ছিক — ওই দিন রাত ১১:৫৯ পর্যন্ত চলবে" error={e.expires_at}>
        <input name="expires_at" type="date" className={adminInput} aria-invalid={!!e.expires_at} />
      </Field>

      <div className="flex flex-wrap items-center gap-4 sm:col-span-2 lg:col-span-3">
        <button disabled={pending} className={btnPrimary}>{pending ? "তৈরি হচ্ছে…" : "কুপন তৈরি করুন"}</button>
        {state.message && <p role="status" className={state.status === "error" ? "text-sindoor" : "text-leaf"}>{state.message}</p>}
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
