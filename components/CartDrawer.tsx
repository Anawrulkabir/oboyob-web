"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import QtyStepper from "./QtyStepper";

/** Cart icon with a count, and the cart that slides in from the right. */
export default function CartDrawer() {
  const cart = useCart();
  const ref = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (cart.isOpen && !d.open) { d.showModal(); document.documentElement.style.overflow = "hidden"; }
    if (!cart.isOpen && d.open) d.close();
  }, [cart.isOpen]);
  useEffect(() => { cart.close(); }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <button type="button" onClick={cart.open} aria-label={`কার্ট — ${cart.count}টি পণ্য`}
        className="relative flex h-10 w-10 items-center justify-center text-ink hover:text-haldi">
        <svg aria-hidden viewBox="0 0 24 24" className="h-[22px] w-[22px] fill-none stroke-current" strokeWidth="1.5" strokeLinejoin="round">
          <path d="M5 8h14l-1.2 12H6.2L5 8z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" strokeLinecap="round" />
        </svg>
        {cart.ready && cart.count > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-haldi px-1 text-[11px] leading-none text-paper tabular-nums">
            {cart.count > 99 ? "99+" : cart.count}
          </span>
        )}
      </button>

      <dialog ref={ref} aria-label="কার্ট"
        onClose={() => { cart.close(); document.documentElement.style.overflow = ""; }}
        onClick={(e) => { if (e.target === e.currentTarget) cart.close(); }}
        className="cart-drawer m-0 ml-auto h-dvh max-h-none w-[92vw] max-w-md bg-paper p-0 text-ink">
        <div className="flex h-full flex-col">
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-5">
            <p className="font-display text-2xl">আপনার কার্ট</p>
            <button type="button" onClick={cart.close} aria-label="কার্ট বন্ধ করুন"
              className="-mr-2 flex h-10 w-10 items-center justify-center hover:text-haldi">
              <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="1.5" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>

          {cart.items.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
              <p className="font-display text-xl">কার্ট খালি</p>
              <p className="text-ink-soft">পছন্দের শাড়ি বা গহনা কার্টে যোগ করুন।</p>
              <Link href="/shop" onClick={cart.close} className="bg-ink px-6 py-3 text-paper hover:bg-ink/85">সংগ্রহ দেখুন</Link>
            </div>
          ) : (
            <>
              <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
                {cart.items.map((i) => (
                  <li key={i.id} className="flex gap-4 py-4">
                    <Link href={`/product/${i.slug}`} onClick={cart.close} className="relative h-24 w-[76px] shrink-0 bg-paper-deep">
                      {i.image ? <Image src={i.image} alt="" fill sizes="76px" className="object-cover" /> : <span className="weave block h-full w-full" />}
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col justify-between">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link href={`/product/${i.slug}`} onClick={cart.close} className="block truncate hover:text-haldi">{i.name}</Link>
                          <p className="text-xs text-ink-soft tabular-nums">{i.code} · {formatPrice(i.price)}</p>
                        </div>
                        <button type="button" onClick={() => cart.remove(i.id)} className="text-sm text-ink-soft underline underline-offset-4 hover:text-sindoor">সরান</button>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <QtyStepper size="sm" value={i.qty} max={Math.min(20, i.stock)} onChange={(n) => cart.setQty(i.id, n)} />
                        <p className="tabular-nums">{formatPrice(i.price * i.qty)}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="space-y-3 border-t border-line px-5 py-5">
                <div className="flex items-baseline justify-between">
                  <span className="text-ink-soft">সাবটোটাল</span>
                  <span className="text-xl tabular-nums">{formatPrice(cart.subtotal)}</span>
                </div>
                <p className="text-xs text-ink-soft">ডেলিভারি চার্জ (ঢাকায় ৳৮০, ঢাকার বাইরে ৳১১০) চেকআউটে যোগ হবে।</p>
                <Link href="/checkout" onClick={cart.close} className="block bg-ink py-3.5 text-center text-paper hover:bg-ink/85">
                  চেকআউট
                </Link>
                <button type="button" onClick={cart.close} className="block w-full text-center text-sm text-ink-soft underline underline-offset-4 hover:text-ink">
                  কেনাকাটা চালিয়ে যান
                </button>
              </div>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}
