import Link from "next/link";
import type { Product } from "@/types/product";
import { getCategory } from "@/lib/categories";
import { site } from "@/lib/site";
import Availability from "./Availability";
import Price from "./Price";

export default function ProductInfo({ product }: { product: Product }) {
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
        <Availability available={product.available} className="text-sm" />
      </div>
      <p className="mt-2 text-sm text-ink-soft">
        প্রোডাক্ট কোড: <span className="tabular-nums text-ink">{product.product_code}</span>
      </p>

      {paragraphs[0] && <p className="mt-6 text-[17px] leading-relaxed">{paragraphs[0]}</p>}

      <div id="product-cta" className="mt-7 flex flex-col gap-3 sm:flex-row">
        {product.available ? (
          <a href="#order" className="bg-ink px-6 py-3 text-center text-paper hover:bg-ink/85">Order Now</a>
        ) : (
          <span className="border border-line px-6 py-3 text-center text-ink-soft">বর্তমানে স্টক শেষ</span>
        )}
        <a
          href={site.facebook}
          target="_blank"
          rel="noopener noreferrer"
          className="border border-ink px-6 py-3 text-center hover:bg-ink hover:text-paper"
        >
          Message on Facebook
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
        <li>📩 অর্ডার করতে নিচের ফর্ম পূরণ করুন, অথবা ইনবক্সে মেসেজ করুন</li>
      </ul>
    </div>
  );
}
