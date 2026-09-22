import Link from "next/link";
import type { Product } from "@/types/product";
import { getCategory } from "@/lib/categories";
import ProductImage from "./ProductImage";
import Availability from "./Availability";
import Price from "./Price";

export default function ProductCard({ product, priority }: { product: Product; priority?: boolean }) {
  const category = getCategory(product.category);
  return (
    <article className="group">
      <Link href={`/product/${product.slug}`} className="block">
        <ProductImage
          product={product}
          sizes="(min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw"
          priority={priority}
          className="aspect-[4/5] w-full overflow-hidden"
        />
        <div className="pt-3">
          <p className="text-xs text-ink-soft">{category?.label}</p>
          <h3 className="mt-0.5 text-lg group-hover:text-haldi">{product.name}</h3>
          <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
            <Price value={product.price} />
            <Availability available={product.available} className="text-xs" />
          </div>
        </div>
      </Link>
    </article>
  );
}
