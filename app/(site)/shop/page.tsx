import type { Metadata } from "next";
import Link from "next/link";
import ProductGrid from "@/components/ProductGrid";
import { CATEGORIES, getCategory } from "@/lib/categories";
import { getProducts } from "@/lib/products";
import { site } from "@/lib/site";

type Props = { searchParams: Promise<{ category?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const cat = getCategory((await searchParams).category);
  return {
    title: cat ? cat.label : "সংগ্রহ",
    description: cat ? `${cat.label} — ${cat.blurb}` : site.description,
    alternates: { canonical: cat ? `/shop?category=${cat.slug}` : "/shop" },
  };
}

export default async function ShopPage({ searchParams }: Props) {
  const active = getCategory((await searchParams).category);
  const products = await getProducts({ category: active?.slug });

  const filters = [{ slug: undefined, label: "সব" }, ...CATEGORIES.map((c) => ({ slug: c.slug, label: c.label }))];

  return (
    <div className="mx-auto max-w-6xl px-5 pt-10 sm:px-8 md:pt-14">
      <header className="mb-8 md:mb-10">
        <h1 className="text-3xl sm:text-4xl">{active ? active.label : "সংগ্রহ"}</h1>
        {active && <p className="mt-2 text-ink-soft">{active.blurb}</p>}
      </header>

      <nav aria-label="ক্যাটাগরি ফিল্টার" className="no-scrollbar -mx-5 mb-10 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        <ul className="flex gap-2">
          {filters.map((f) => {
            const isActive = f.slug === active?.slug;
            return (
              <li key={f.label} className="shrink-0">
                <Link
                  href={f.slug ? `/shop?category=${f.slug}` : "/shop"}
                  aria-current={isActive ? "page" : undefined}
                  className={`block border px-4 py-1.5 text-sm ${
                    isActive ? "border-ink bg-ink text-paper" : "border-line text-ink-soft hover:border-ink hover:text-ink"
                  }`}
                >
                  {f.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {products.length > 0 ? (
        <ProductGrid products={products} />
      ) : (
        <div className="border-t border-line py-16 text-center">
          <p className="font-display text-xl">এই ক্যাটাগরিতে নতুন পণ্য শীঘ্রই আসছে।</p>
          <p className="mt-2 text-ink-soft">এর মধ্যে বাকি সংগ্রহ দেখুন, অথবা Facebook পেজে আপডেট পান।</p>
          <div className="mt-6 flex justify-center gap-3 text-sm">
            <Link href="/shop" className="border border-ink px-5 py-2 hover:bg-ink hover:text-paper">সব পণ্য দেখুন</Link>
            <a href={site.facebook} target="_blank" rel="noopener noreferrer" className="border border-line px-5 py-2 hover:border-ink">Facebook Page</a>
          </div>
        </div>
      )}
    </div>
  );
}
