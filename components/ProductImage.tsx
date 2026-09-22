import Image from "next/image";
import type { Product } from "@/types/product";

interface Props {
  /** Pass the full product to get the "Sold out" tag when available is false. */
  product: Pick<Product, "name" | "images" | "product_code"> & { available?: boolean };
  index?: number;
  sizes: string;
  priority?: boolean;
  className?: string;
}

/** Product photo, or a woven placeholder until real photography is uploaded. */
export default function ProductImage({ product, index = 0, sizes, priority, className = "" }: Props) {
  const img = product.images[index];
  const soldOut = product.available === false;
  if (!img) {
    return (
      <div className={`weave relative flex items-end ${className}`} role="img" aria-label={`${product.name} — ছবি শীঘ্রই আসছে`}>
        <span className="m-3 bg-paper/90 px-2 py-0.5 text-[11px] text-ink-soft">ছবি শীঘ্রই</span>
        {soldOut && <SoldOutTag />}
      </div>
    );
  }
  return (
    <div className={`relative bg-paper-deep ${className}`}>
      <Image
        src={img.image_url}
        alt={img.alt_text ?? product.name}
        fill
        sizes={sizes}
        priority={priority}
        className={`object-cover ${soldOut ? "opacity-60 grayscale-[60%]" : ""}`}
      />
      {soldOut && <SoldOutTag />}
    </div>
  );
}

function SoldOutTag() {
  return (
    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-6 border-2 border-sindoor bg-paper/90 px-3 py-1 text-sm font-semibold tracking-[0.15em] text-sindoor uppercase shadow-sm sm:text-base">
      Sold out
    </span>
  );
}
