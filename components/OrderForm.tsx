"use client";

import { useActionState, useEffect, useRef, useState, startTransition } from "react";
import Link from "next/link";
import { submitOrder, type OrderState } from "@/app/actions/order";
import { formatPrice } from "@/lib/format";
import { site } from "@/lib/site";

interface Props {
  slug: string;
  productName: string;
  productCode: string;
  price: number | null;
  /** Pieces in stock — the most one order can take. */
  stock: number;
}

type Fields = { name: string; phone: string; address: string; email: string; note: string };
const EMPTY: Fields = { name: "", phone: "", address: "", email: "", note: "" };
const SAVED = "oboyob:checkout";

const input =
  "mt-1.5 w-full border border-line bg-paper px-3 py-3 text-[16px] outline-none focus:border-ink aria-[invalid=true]:border-sindoor";

export default function OrderForm({ slug, productName, productCode, price, stock }: Props) {
  const maxQty = Math.max(1, Math.min(20, stock));
  const [state, action, pending] = useActionState<OrderState, FormData>(submitOrder, { status: "idle" });
  const [f, setF] = useState<Fields>(EMPTY);
  const [qty, setQty] = useState(1);
  const [account, setAccount] = useState<{ email: string | null } | null>(null);
  const [prefilled, setPrefilled] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);
  const e = state.errors ?? {};
  const set = (k: keyof Fields) => (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: ev.target.value }));

  // Prefill: signed-in profile first, otherwise details saved on this device.
  useEffect(() => {
    let alive = true;
    fetch("/api/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { user: null }))
      .catch(() => ({ user: null }))
      .then((me) => {
        if (!alive) return;
        if (me.user) {
          setAccount(me.user);
          const p = me.profile ?? {};
          setF((prev) => ({ ...prev, name: p.full_name ?? "", phone: p.phone ?? "", address: p.address ?? "" }));
          setPrefilled(!!(p.full_name || p.phone || p.address));
        } else {
          try {
            const saved = JSON.parse(localStorage.getItem(SAVED) ?? "null");
            if (saved) { setF((prev) => ({ ...prev, ...saved, note: "" })); setPrefilled(true); }
          } catch {}
        }
      });
    return () => { alive = false; };
  }, []);

  // After submit: focus the first problem, or show the confirmation.
  useEffect(() => {
    if (state.status === "error" && state.errors) {
      const first = Object.keys(state.errors)[0];
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
    }
    if (state.status === "success") {
      if (!account) {
        try { localStorage.setItem(SAVED, JSON.stringify({ name: f.name, phone: f.phone, address: f.address, email: f.email })); } catch {}
      }
      doneRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      doneRef.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const total = price != null ? formatPrice(price * qty) : null;

  if (stock <= 0 && state.status !== "success") {
    return (
      <div className="border border-sindoor/40 p-5">
        <p className="font-display text-xl text-sindoor">Sold out — এই মুহূর্তে বিক্রি শেষ</p>
        <p className="mt-1 text-[15px] text-ink-soft">
          আবার কবে আসবে জানতে{" "}
          <a href={site.facebook} target="_blank" rel="noopener noreferrer" className="text-ink underline underline-offset-4">Facebook পেজে মেসেজ করুন</a>।
        </p>
      </div>
    );
  }

  if (state.status === "success") {
    return (
      <div ref={doneRef} tabIndex={-1} role="status" className="border border-ink p-6 outline-none">
        <p className="font-display text-2xl">ধন্যবাদ, অর্ডার পেয়েছি।</p>
        <p className="mt-2 text-ink-soft">
          {productName} × {qty.toLocaleString("bn-BD")}
          {total && <> / {total}</>}
          {state.orderRef && <> / রেফারেন্স <span className="tabular-nums text-ink">#{state.orderRef}</span></>}
        </p>
        <ol className="mt-5 space-y-2 text-[15px]">
          <li className="flex gap-3"><span className="tabular-nums text-haldi">১</span>কনফার্ম করতে আমরা আপনাকে ফোন করব।</li>
          <li className="flex gap-3"><span className="tabular-nums text-haldi">২</span>কনফার্মের পর পণ্য পাঠানো হবে।</li>
          <li className="flex gap-3"><span className="tabular-nums text-haldi">৩</span>সারা বাংলাদেশে হোম ডেলিভারি।</li>
        </ol>
        {state.emailed && <p className="mt-4 text-sm text-ink-soft">কনফার্মেশন ইমেইলে পাঠানো হয়েছে।</p>}
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          {state.loggedIn ? (
            <Link href="/account" className="bg-ink px-5 py-2.5 text-paper">অর্ডার ট্র্যাক করুন</Link>
          ) : (
            <Link href={`/login?next=/account`} className="bg-ink px-5 py-2.5 text-paper">লগইন করে অর্ডার ট্র্যাক করুন</Link>
          )}
          <Link href="/shop" className="border border-ink px-5 py-2.5">আরও দেখুন</Link>
        </div>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      noValidate
      className="space-y-5"
      onSubmit={(ev) => {
        ev.preventDefault();
        const fd = new FormData(ev.currentTarget);
        startTransition(() => action(fd));
      }}
    >
      <input type="hidden" name="slug" value={slug} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

      {account ? (
        <p className="text-sm text-ink-soft">
          লগইন করা আছে{account.email && <> ({account.email})</>}{prefilled && " — আপনার তথ্য বসানো হয়েছে।"}
        </p>
      ) : (
        <p className="text-sm text-ink-soft">
          {prefilled ? "আগের অর্ডারের তথ্য বসানো হয়েছে। " : ""}
          <Link href={`/login?next=${encodeURIComponent(`/product/${slug}#order`)}`} className="text-ink underline underline-offset-4">
            লগইন করুন
          </Link>{" "}
          অর্ডার ট্র্যাক করতে — অথবা লগইন ছাড়াই অর্ডার করুন।
        </p>
      )}

      <div className="flex items-center justify-between gap-4 border border-line bg-paper-deep px-4 py-3">
        <div className="min-w-0">
          <p className="truncate">{productName}</p>
          <p className="text-xs tabular-nums text-ink-soft">{productCode}</p>
        </div>
        <div className="flex shrink-0 items-stretch border border-line bg-paper">
          <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-10 text-lg hover:bg-paper-deep" aria-label="পরিমাণ কমান">−</button>
          <input name="quantity" type="number" min={1} max={maxQty} value={qty} aria-label="পরিমাণ" aria-invalid={!!e.quantity}
            onChange={(ev) => setQty(Math.min(maxQty, Math.max(1, Number(ev.target.value) || 1)))}
            className="w-11 border-x border-line bg-paper py-2 text-center tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
          <button type="button" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} disabled={qty >= maxQty} className="w-10 text-lg hover:bg-paper-deep disabled:opacity-30" aria-label="পরিমাণ বাড়ান">+</button>
        </div>
      </div>
      {e.quantity && <p className="-mt-3 text-sm text-sindoor">{e.quantity}</p>}

      <Field label="নাম" name="name" error={e.name}>
        <input id="name" name="name" value={f.name} onChange={set("name")} autoComplete="name" enterKeyHint="next"
          className={input} aria-invalid={!!e.name} aria-describedby={e.name ? "name-err" : undefined} />
      </Field>

      <Field label="মোবাইল নম্বর" name="phone" error={e.phone}>
        <div className={`mt-1.5 flex border bg-paper focus-within:border-ink ${e.phone ? "border-sindoor" : "border-line"}`}>
          <span className="flex items-center border-r border-line bg-paper-deep px-3 text-ink-soft">+88</span>
          <input id="phone" name="phone" value={f.phone} onChange={set("phone")} type="tel" inputMode="tel" autoComplete="tel-national"
            placeholder="01XXXXXXXXX" enterKeyHint="next" className="w-full bg-paper px-3 py-3 text-[16px] tabular-nums outline-none"
            aria-invalid={!!e.phone} aria-describedby={e.phone ? "phone-err" : undefined} />
        </div>
      </Field>

      <Field label="ঠিকানা" name="address" error={e.address} hint="বাসা/রোড, এলাকা, থানা, জেলা">
        <textarea id="address" name="address" value={f.address} onChange={set("address")} rows={3} autoComplete="street-address"
          className={input} aria-invalid={!!e.address} aria-describedby={e.address ? "address-err" : undefined} />
      </Field>

      {!account?.email && (
        <Field label="ইমেইল" name="email" optional error={e.email} hint="দিলে অর্ডারের কনফার্মেশন ও আপডেট ইমেইলে পাবেন">
          <input id="email" name="email" value={f.email} onChange={set("email")} type="email" inputMode="email" autoComplete="email"
            className={input} aria-invalid={!!e.email} aria-describedby={e.email ? "email-err" : undefined} />
        </Field>
      )}

      <Field label="নোট" name="note" optional>
        <textarea id="note" name="note" value={f.note} onChange={set("note")} rows={2} placeholder="ডেলিভারির সময় বা অন্য কিছু" className={input} />
      </Field>

      {state.status === "error" && state.message && (
        <p role="alert" className="text-sm text-sindoor">
          {state.message}{" "}
          {!state.errors && <a href={site.facebook} target="_blank" rel="noopener noreferrer" className="underline">Facebook Page</a>}
        </p>
      )}

      <div className="flex flex-col gap-2 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
        {total ? (
          <p><span className="text-ink-soft">মোট </span><span className="text-xl tabular-nums">{total}</span></p>
        ) : (
          <p className="text-sm text-ink-soft">দাম ফোনে কনফার্ম করা হবে।</p>
        )}
        <button type="submit" disabled={pending} className="bg-ink px-8 py-3.5 text-paper hover:bg-ink/85 disabled:opacity-60">
          {pending ? "পাঠানো হচ্ছে…" : "অর্ডার কনফার্ম করুন"}
        </button>
      </div>
      <p className="text-xs text-ink-soft">এখন কোনো পেমেন্ট লাগবে না। অর্ডারের পর আমরা ফোনে কনফার্ম করব।</p>
    </form>
  );
}

function Field({ label, name, error, hint, optional, children }: {
  label: string; name: string; error?: string; hint?: string; optional?: boolean; children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className="text-sm text-ink-soft">
        {label}{optional && <span className="text-ink-soft/70"> (ঐচ্ছিক)</span>}
      </label>
      {children}
      {error ? (
        <p id={`${name}-err`} className="mt-1 text-sm text-sindoor">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-ink-soft">{hint}</p>
      ) : null}
    </div>
  );
}
