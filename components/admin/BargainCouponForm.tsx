"use client";

import { useActionState, useMemo, useState } from "react";
import { createBargainCoupon, type BargainState } from "@/app/admin/actions";
import { formatPrice } from "@/lib/format";
import { adminInput, btnPrimary, btnQuiet } from "./styles";

export interface BargainProduct { id: string; name: string; code: string; price: number | null }

/** "Customer bargained on Messenger" → single-use code for this product at the agreed price. */
export default function BargainCouponForm({ products, initialProductId }: { products: BargainProduct[]; initialProductId?: string }) {
  const [state, action, pending] = useActionState<BargainState, FormData>(createBargainCoupon, { status: "idle" });
  const [productId, setProductId] = useState(initialProductId ?? "");
  const [agreed, setAgreed] = useState("");
  const [copied, setCopied] = useState<"code" | "share" | null>(null);
  const e = state.errors ?? {};
  const product = useMemo(() => products.find((p) => p.id === productId), [products, productId]);
  const agreedN = Number(agreed);
  const off = product?.price != null && agreedN > 0 && agreedN < product.price ? product.price - agreedN : null;

  async function copy(text: string, what: "code" | "share") {
    try { await navigator.clipboard.writeText(text); } catch {
      const t = document.createElement("textarea"); t.value = text; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove();
    }
    setCopied(what); setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="border border-haldi/50 bg-haldi-soft/10 p-5">
      <h2 className="text-xl">দরদামের কুপন (একজন গ্রাহকের জন্য)</h2>
      <p className="mt-1 text-sm text-ink-soft">
        গ্রাহক Messenger-এ দরদাম করে কম দামে রাজি হলে: পণ্য ও রাজি হওয়া দাম দিন → একটি কোড তৈরি হবে যা শুধু ওই পণ্যে, একবার, (নম্বর দিলে) শুধু ওই নম্বরে কাজ করবে।
      </p>

      <form action={action} className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-sm text-ink-soft">পণ্য</span>
          <select name="product_id" value={productId} onChange={(ev) => setProductId(ev.target.value)} required className={adminInput} aria-invalid={!!e.product_id}>
            <option value="" disabled>বাছাই করুন</option>
            {products.map((p) => (
              <option key={p.id} value={p.id} disabled={p.price == null}>
                {p.name} ({p.code}) — {p.price != null ? formatPrice(p.price) : "দাম নেই"}
              </option>
            ))}
          </select>
          {e.product_id && <span className="mt-1 block text-sm text-sindoor">{e.product_id}</span>}
        </label>

        <label className="block">
          <span className="text-sm text-ink-soft">রাজি হওয়া দাম (প্রতি পিস, ৳)</span>
          <input name="agreed_price" inputMode="numeric" value={agreed} onChange={(ev) => setAgreed(ev.target.value)} required
            placeholder={product?.price ? `যেমন ${Math.round(product.price * 0.85)}` : ""} className={adminInput} aria-invalid={!!e.agreed_price} />
          {e.agreed_price ? <span className="mt-1 block text-sm text-sindoor">{e.agreed_price}</span>
            : off != null && <span className="mt-1 block text-sm text-leaf">{formatPrice(off)} ছাড়ের কুপন হবে</span>}
        </label>

        <label className="block">
          <span className="text-sm text-ink-soft">গ্রাহকের মোবাইল (ঐচ্ছিক, সুপারিশকৃত)</span>
          <input name="phone" type="tel" inputMode="tel" placeholder="01XXXXXXXXX" className={adminInput} aria-invalid={!!e.phone} />
          <span className="mt-1 block text-xs text-ink-soft">দিলে কোডটি অন্য কেউ ব্যবহার করতে পারবে না।</span>
          {e.phone && <span className="mt-1 block text-sm text-sindoor">{e.phone}</span>}
        </label>

        <label className="block">
          <span className="text-sm text-ink-soft">মেয়াদ</span>
          <select name="days" defaultValue="3" className={adminInput}>
            {[1, 2, 3, 7, 14, 30].map((d) => <option key={d} value={d}>{d.toLocaleString("bn-BD")} দিন</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-sm text-ink-soft">নোট (শুধু আপনার জন্য)</span>
          <input name="note" placeholder="যেমন রহিম, Messenger" className={adminInput} />
        </label>

        <div className="sm:col-span-2">
          <button disabled={pending} className={btnPrimary}>{pending ? "তৈরি হচ্ছে…" : "কুপন তৈরি করুন"}</button>
          {state.status === "error" && state.message && <span className="ml-3 text-sm text-sindoor">{state.message}</span>}
        </div>
      </form>

      {state.status === "created" && state.code && (
        <div role="status" className="mt-5 border border-leaf/50 bg-paper p-4">
          <p className="text-leaf">✓ {state.message}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="border border-ink px-3 py-1.5 font-medium tracking-widest">{state.code}</span>
            <button type="button" onClick={() => copy(state.code!, "code")} className={btnQuiet}>{copied === "code" ? "✓ কপি হয়েছে" : "কোড কপি"}</button>
          </div>
          <p className="mt-4 text-sm text-ink-soft">গ্রাহককে পাঠানোর মেসেজ:</p>
          <pre className="mt-1 whitespace-pre-wrap border border-line bg-white p-3 font-sans text-sm leading-relaxed">{state.share}</pre>
          <button type="button" onClick={() => copy(state.share!, "share")} className={`${btnPrimary} mt-2`}>
            {copied === "share" ? "✓ মেসেজ কপি হয়েছে" : "মেসেজ কপি করুন"}
          </button>
        </div>
      )}
    </div>
  );
}
