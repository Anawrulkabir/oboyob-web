import Link from "next/link";
import type { Category } from "@/lib/categories";
import type { Product } from "@/types/product";
import ProductImage from "./ProductImage";

export default function CategoryCard({ category, count, cover }: { category: Category; count: number; cover?: Product }) {
  return (
    <Link href={`/shop?category=${category.slug}`} className="group block text-center">
      <div className="arch relative aspect-[4/5] overflow-hidden border border-line bg-paper-deep">
        {cover ? (
          <ProductImage product={cover} sizes="(min-width:1024px) 25vw, 50vw"
            className="h-full w-full transition-transform duration-500 group-hover:scale-[1.04]" />
        ) : (
          <div className="weave flex h-full items-center justify-center">
            <span className="font-display text-4xl text-ink/80 sm:text-5xl">{category.label}</span>
          </div>
        )}
      </div>
      <h3 className="mt-4 text-2xl group-hover:text-haldi">{category.label}</h3>
      <p className="mx-auto mt-0.5 max-w-[16rem] text-sm text-ink-soft">{category.blurb}</p>
      <p className="mt-1.5 text-xs text-haldi">
        {count > 0 ? `${count.toLocaleString("bn-BD")}টি পণ্য →` : "শীঘ্রই আসছে"}
      </p>
    </Link>
  );
}
