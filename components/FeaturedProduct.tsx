import Link from "next/link";
import type { Product } from "@/types/product";
import ProductImage from "./ProductImage";
import Price from "./Price";
import Availability from "./Availability";

export default function FeaturedProduct({ product }: { product: Product }) {
  const lead = product.description?.split(/\n\s*\n/)[0];
  return (
    <section aria-labelledby="featured-title" className="bg-paper-deep">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 sm:px-8 md:grid-cols-2 md:items-center md:gap-14 md:py-20">
        <ProductImage product={product} index={product.images.length > 1 ? 1 : 0} sizes="(min-width:768px) 50vw, 100vw" className="aspect-[4/5] w-full" />
        <div className="max-w-md">
          <p className="text-sm text-ink-soft">{product.subtitle}</p>
          <h2 id="featured-title" className="mt-2 text-3xl sm:text-4xl">{product.name}</h2>
          <div className="mt-4 flex items-baseline gap-5">
            <Price value={product.price} className="text-lg" />
            <Availability available={product.available} stock={product.stock} className="text-sm" />
          </div>
          {lead && <p className="mt-6 text-ink-soft">{lead}</p>}
          {product.features.length > 0 && (
            <ul className="mt-6 space-y-1.5 text-[15px]">
              {product.features.slice(0, 3).map((f) => (
                <li key={f} className="flex gap-3"><span aria-hidden className="mt-3 h-px w-3 shrink-0 bg-haldi" />{f}</li>
              ))}
            </ul>
          )}
          <Link href={`/product/${product.slug}`} className="mt-8 inline-block border border-ink px-6 py-3 hover:bg-ink hover:text-paper">
            বিস্তারিত দেখুন
          </Link>
        </div>
      </div>
    </section>
  );
}
