"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/types/product";
import { useCart } from "@/lib/cart";
import { site } from "@/lib/site";
import QtyStepper from "./QtyStepper";

export default function AddToCart({ product }: { product: Product }) {
  const cart = useCart();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  if (!product.available) {
    return (
      <div className="border border-sindoor/40 p-5">
        <p className="font-display text-xl text-sindoor">Sold out — এই মুহূর্তে বিক্রি শেষ</p>
        <p className="mt-1 text-[15px] text-ink-soft">
          আবার কবে আসবে জানতে <a href={site.facebook} target="_blank" rel="noopener noreferrer" className="text-ink underline underline-offset-4">Facebook পেজে মেসেজ করুন</a>।
        </p>
      </div>
    );
  }
  if (product.price == null) {
    return (
      <div className="border border-line p-5">
        <p className="font-display text-xl">দাম জানতে মেসেজ করুন</p>
        <p className="mt-1 text-[15px] text-ink-soft">
          এই পণ্যটির অর্ডার <a href={site.facebook} target="_blank" rel="noopener noreferrer" className="text-ink underline underline-offset-4">Facebook পেজে</a> নেওয়া হচ্ছে।
        </p>
      </div>
    );
  }

  const inCart = cart.items.find((i) => i.id === product.id)?.qty ?? 0;
  const max = Math.max(1, Math.min(20, product.stock) - inCart);
  const soldOutForYou = inCart >= Math.min(20, product.stock);
  const item = {
    id: product.id, slug: product.slug, name: product.name, code: product.product_code,
    price: product.price, image: product.images[0]?.image_url ?? null, stock: product.stock,
  };
  const add = () => { cart.add(item, qty); setAdded(true); setQty(1); };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <span className="text-sm text-ink-soft">পরিমাণ</span>
        <QtyStepper value={Math.min(qty, max)} max={max} onChange={setQty} />
        {product.stock <= 3 && <span className="text-sm text-haldi">মাত্র {product.stock.toLocaleString("bn-BD")}টি বাকি</span>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => { add(); cart.open(); }} disabled={soldOutForYou}
          className="border border-ink py-3.5 hover:bg-ink hover:text-paper disabled:opacity-40">
          কার্টে যোগ করুন
        </button>
        <button type="button" onClick={() => { if (!soldOutForYou) add(); router.push("/checkout"); }}
          className="bg-ink py-3.5 text-paper hover:bg-ink/85">
          এখনই কিনুন
        </button>
      </div>
      {soldOutForYou ? (
        <p className="text-sm text-ink-soft">স্টকের সবগুলো আপনার কার্টে আছে।</p>
      ) : added ? (
        <p role="status" className="text-sm text-leaf">✓ কার্টে যোগ হয়েছে।</p>
      ) : null}
      <ul className="space-y-1 border-t border-line pt-4 text-sm text-ink-soft">
        <li>💵 ক্যাশ অন ডেলিভারি — পণ্য হাতে পেয়ে টাকা দিন</li>
        <li>🚚 ডেলিভারি চার্জ: ঢাকার ভিতরে ৳৮০, ঢাকার বাইরে ৳১১০</li>
      </ul>
    </div>
  );
}
