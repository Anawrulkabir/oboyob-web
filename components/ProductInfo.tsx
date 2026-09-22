import Link from "next/link";
import type { Product } from "@/types/product";
import { getCategory } from "@/lib/categories";
import { site } from "@/lib/site";
import Availability from "./Availability";
import Price from "./Price";

/** `cta` is the buy box (add to cart); the admin preview leaves it out and gets a static stand-in. */
export default function ProductInfo({ product, cta }: { product: Product; cta?: React.ReactNode }) {
  const category = getCategory(product.category);
  const paragraphs = product.description?.split(/\n\s*\n/).filter(Boolean) ?? [];

  return (
    <div>
      <p className="text-sm text-ink-soft">
        <Link href={`/shop?category=${product.category}`} className="hover:text-ink">{category?.label}</Link>
      </p>
      <h1 className="mt-2 text-4xl sm:text-5xl">{product.name}</h1>
      {product.subtitle && <p className="mt-2 text-ink-soft">{product.subtitle}</p>}

      <div className="mt-6 flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <Price value={product.price} className="text-2xl" />
        <Availability available={product.available} stock={product.stock} className="text-sm" />
      </div>
      <p className="mt-2 text-sm text-ink-soft">
        প্রোডাক্ট কোড: <span className="tabular-nums text-ink">{product.product_code}</span>
      </p>

      {paragraphs[0] && <p className="mt-6 text-[17px] leading-relaxed">{paragraphs[0]}</p>}

      <div id="product-cta" className="mt-7 scroll-mt-24">
        {cta ?? (
          product.available ? (
            <span className="block bg-ink px-6 py-3 text-center text-paper">কার্টে যোগ করুন</span>
          ) : (
            <span className="block border border-sindoor/50 px-6 py-3 text-center text-sindoor">Sold out — এই মুহূর্তে বিক্রি শেষ</span>
          )
        )}
        <a href={site.facebook} target="_blank" rel="noopener noreferrer"
          className="mt-3 inline-block text-sm text-ink-soft underline decoration-line underline-offset-4 hover:text-ink">
          প্রশ্ন আছে? Facebook-এ মেসেজ করুন
        </a>
      </div>

      {product.features.length > 0 && (
        <section aria-labelledby="features-title" className="mt-10">
          <h2 id="features-title" className="text-lg">বৈশিষ্ট্য</h2>
          <ul className="mt-3 space-y-2 text-[15px]">
            {product.features.map((f) => (
              <li key={f} className="flex gap-3"><span aria-hidden className="mt-3 h-px w-3 shrink-0 bg-haldi" />{f}</li>
            ))}
          </ul>
        </section>
      )}

      {paragraphs.slice(1).map((p) => (
        <p key={p} className="mt-6 text-ink-soft">{p}</p>
      ))}

      <ul className="mt-6 space-y-1 text-sm text-ink-soft">
        <li>🚚 হোম ডেলিভারি: সারা বাংলাদেশ</li>
        <li>💵 ক্যাশ অন ডেলিভারি</li>
      </ul>
    </div>
  );
}
