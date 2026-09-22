import Image from "next/image";
import Hero from "@/components/Hero";
import ProductGrid from "@/components/ProductGrid";
import CategoryCard from "@/components/CategoryCard";
import FeaturedProduct from "@/components/FeaturedProduct";
import FacebookCTA from "@/components/FacebookCTA";
import SectionHeading from "@/components/SectionHeading";
import { CATEGORIES } from "@/lib/categories";
import { getProducts } from "@/lib/products";

export const revalidate = 300;

export default async function HomePage() {
  const products = await getProducts();
  const featured = products.find((p) => p.featured) ?? products[0] ?? null;
  const latest = products.filter((p) => p.id !== featured?.id).slice(0, 4);
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c.slug, products.filter((p) => p.category === c.slug).length]));

  return (
    <>
      <Hero product={featured} />
      <div className="paar mx-auto max-w-6xl" aria-hidden />

      {latest.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 pt-16 sm:px-8 md:pt-24" aria-label="নতুন সংগ্রহ">
          <SectionHeading title="নতুন সংগ্রহ" href="/shop" linkText="সব দেখুন" />
          <ProductGrid products={latest} />
        </section>
      )}

      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 md:py-24" aria-label="ক্যাটাগরি">
        <SectionHeading title="ক্যাটাগরি অনুযায়ী দেখুন" />
        <div className="grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4 lg:gap-x-8">
          {CATEGORIES.map((c) => (
            <CategoryCard key={c.slug} category={c} count={counts[c.slug] ?? 0} />
          ))}
        </div>
      </section>

      {featured && <FeaturedProduct product={featured} />}

      <section className="mx-auto max-w-2xl px-5 py-20 text-center sm:py-28">
        <Image src="/images/logo.png" alt="" width={96} height={96} className="mx-auto h-24 w-24 opacity-90" />
        <p className="mt-6 font-display text-xl leading-relaxed sm:text-2xl sm:leading-relaxed">
          দেশের তাঁতির হাতে বোনা কাপড়, আর যত্নে বেছে নেওয়া গহনা — অবয়ব সেই সহজ সৌন্দর্যকেই পৌঁছে দেয় আপনার কাছে।
        </p>
        <p className="mt-4 text-sm text-ink-soft">Wear your identity.</p>
      </section>

      <FacebookCTA />
    </>
  );
}
