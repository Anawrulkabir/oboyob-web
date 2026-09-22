import Link from "next/link";
import type { Product } from "@/types/product";
import ProductImage from "./ProductImage";

export default function Hero({ product }: { product: Product | null }) {
  return (
    <section className="mx-auto grid max-w-6xl items-end gap-10 px-5 pt-8 pb-14 sm:px-8 md:grid-cols-[1fr_minmax(0,420px)] md:gap-16 md:pt-16 md:pb-20">
      {/* Image first on mobile: photography leads. */}
      {product && (
        <Link
          href={`/product/${product.slug}`}
          className="relative mx-auto w-[78%] max-w-[420px] md:order-2 md:w-full"
          aria-label={`${product.name} দেখুন`}
        >
          {/* outline arch, offset — echoes the logo's ring */}
          <span aria-hidden className="arch absolute -inset-2.5 border border-line sm:-inset-3.5" />
          <ProductImage product={product} priority sizes="(min-width:768px) 420px, 78vw" className="arch aspect-[3/4] w-full" />
          <span className="absolute -bottom-11 left-0 text-sm text-ink-soft">
            {product.name}
            {product.subtitle && <span className="text-ink-soft/80"> / {product.subtitle}</span>}
          </span>
        </Link>
      )}

      <div className="pt-6 md:order-1 md:pb-6">
        <p className="text-sm text-haldi">অবয়ব / Wear your identity</p>
        <h1 className="mt-4 text-[2rem] leading-[1.35] sm:text-5xl sm:leading-[1.3]">
          দেশীয় সৌন্দর্যের
          <br />
          নিজস্ব এক প্রকাশ।
        </h1>
        <p className="mt-5 max-w-md text-ink-soft sm:text-lg">
          শাড়ি, গহনা ও ভালোবাসায় বেছে নেওয়া কিছু সুন্দর মুহূর্ত।
        </p>
        <Link href="/shop" className="mt-8 inline-block bg-ink px-6 py-3 text-paper hover:bg-ink/85">
          আমাদের সংগ্রহ দেখুন
        </Link>
      </div>
    </section>
  );
}
