import Link from "next/link";
import type { Product } from "@/types/product";
import ProductImage from "./ProductImage";
import Price from "./Price";

export default function Hero({ product }: { product: Product | null }) {
  return (
    <section className="relative overflow-hidden">
      {/* soft turmeric halo behind the arch — echoes the ring in the logo */}
      <div aria-hidden className="pointer-events-none absolute -right-24 top-24 h-[28rem] w-[28rem] rounded-full bg-haldi-soft/25 blur-3xl md:right-0 md:top-10" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 pt-8 pb-12 sm:px-8 md:grid-cols-[1.05fr_minmax(0,440px)] md:gap-16 md:pt-16 md:pb-20">
        <div>
          <p className="flex items-center gap-3 text-sm text-haldi">
            <span aria-hidden className="h-px w-8 bg-haldi" /> দেশীয় তাঁত · হাতে বাছাই করা গহনা
          </p>
          <h1 className="mt-4 text-[2.4rem] leading-[1.3] sm:text-6xl sm:leading-[1.25]">
            দেশীয় সৌন্দর্যের
            <br />
            <span className="text-haldi">নিজস্ব</span> এক প্রকাশ।
          </h1>
          <p className="mt-5 max-w-md text-[17px] text-ink-soft sm:text-lg">
            তাঁতির হাতে বোনা শাড়ি, যত্নে বেছে নেওয়া গহনা — আপনার দরজায়, সারা বাংলাদেশে।
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/shop" className="bg-ink px-7 py-3.5 text-paper hover:bg-ink/85">সংগ্রহ দেখুন</Link>
            <Link href="/shop?category=sharee" className="border border-ink px-7 py-3.5 hover:bg-ink hover:text-paper">শাড়ি</Link>
          </div>
        </div>

        {product && (
          <Link href={`/product/${product.slug}`} className="group relative mx-auto w-[82%] max-w-[440px] md:w-full" aria-label={`${product.name} দেখুন`}>
            <span aria-hidden className="arch absolute -inset-2.5 border border-haldi/40 sm:-inset-3.5" />
            <ProductImage product={product} priority sizes="(min-width:768px) 440px, 82vw" className="arch aspect-[3/4] w-full" />
            <span className="absolute -bottom-5 left-1/2 w-max max-w-[92%] -translate-x-1/2 border border-line bg-paper px-4 py-2 text-center shadow-[0_6px_20px_-12px_rgba(35,31,27,0.35)]">
              <span className="block font-display text-lg leading-snug group-hover:text-haldi">{product.name}</span>
              <Price value={product.price} className="text-sm" />
            </span>
          </Link>
        )}
      </div>
    </section>
  );
}
