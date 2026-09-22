"use client";

import { useState } from "react";
import type { Product } from "@/types/product";
import ProductCard from "@/components/ProductCard";
import ProductImage from "@/components/ProductImage";
import ProductInfo from "@/components/ProductInfo";
import ProductSpecifications from "@/components/ProductSpecifications";

// Renders the draft with the shop's own components, so what the admin sees
// is exactly what customers will see. Links are inert inside the preview.
export default function ProductPreview({ product }: { product: Product }) {
  const [view, setView] = useState<"card" | "page">("card");
  return (
    <div>
      <div role="tablist" className="grid grid-cols-2 border border-line text-sm">
        {([["card", "শপে কার্ড"], ["page", "পণ্যের পেজ"]] as const).map(([v, label]) => (
          <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)}
            className={`py-2 ${view === v ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"}`}>
            {label}
          </button>
        ))}
      </div>

      <div inert className="mt-4 select-none bg-paper">
        {view === "card" ? (
          <div className="mx-auto max-w-[240px]">
            <ProductCard product={product} />
          </div>
        ) : (
          <div className="space-y-8 border border-line p-4 text-[15px]">
            <ProductImage product={product} sizes="360px" className="aspect-[4/5] w-full" />
            <ProductInfo product={product} />
            <ProductSpecifications specs={product.specifications} />
          </div>
        )}
      </div>
    </div>
  );
}
