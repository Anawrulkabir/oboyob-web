import Image from "next/image";
import type { Product } from "@/types/product";

interface Props {
  product: Pick<Product, "name" | "images" | "product_code">;
  index?: number;
  sizes: string;
  priority?: boolean;
  className?: string;
}

/** Product photo, or a woven placeholder until real photography is uploaded. */
export default function ProductImage({ product, index = 0, sizes, priority, className = "" }: Props) {
  const img = product.images[index];
  if (!img) {
    return (
      <div className={`weave relative flex items-end ${className}`} role="img" aria-label={`${product.name} — ছবি শীঘ্রই আসছে`}>
        <span className="m-3 bg-paper/90 px-2 py-0.5 text-[11px] text-ink-soft">ছবি শীঘ্রই</span>
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
        className="object-cover"
      />
    </div>
  );
}
