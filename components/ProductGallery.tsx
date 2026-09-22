"use client";

import { useState } from "react";
import Image from "next/image";
import type { Product } from "@/types/product";
import ProductImage from "./ProductImage";

export default function ProductGallery({ product }: { product: Product }) {
  const [active, setActive] = useState(0);
  const images = product.images;

  if (images.length <= 1) {
    return <ProductImage product={product} priority sizes="(min-width:768px) 55vw, 100vw" className="aspect-[4/5] w-full" />;
  }

  return (
    <div>
      <ProductImage product={product} index={active} priority sizes="(min-width:768px) 55vw, 100vw" className="aspect-[4/5] w-full" />
      <ul className="no-scrollbar mt-3 flex gap-2 overflow-x-auto" aria-label="আরও ছবি">
        {images.map((img, i) => (
          <li key={img.id} className="shrink-0">
            <button
              type="button"
              onClick={() => setActive(i)}
              aria-label={`ছবি ${i + 1}`}
              aria-current={i === active}
              className={`relative block h-20 w-16 border ${i === active ? "border-ink" : "border-transparent opacity-70 hover:opacity-100"}`}
            >
              <Image src={img.image_url} alt="" fill sizes="64px" className="object-cover" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
