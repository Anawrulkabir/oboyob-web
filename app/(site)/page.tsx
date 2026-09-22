import Image from "next/image";
import Hero from "@/components/Hero";
import TrustStrip from "@/components/TrustStrip";
import ProductGrid from "@/components/ProductGrid";
import CategoryCard from "@/components/CategoryCard";
import FeaturedProduct from "@/components/FeaturedProduct";
import HowToOrder from "@/components/HowToOrder";
import FacebookCTA from "@/components/FacebookCTA";
import SectionHeading from "@/components/SectionHeading";
import { CATEGORIES } from "@/lib/categories";
import { getProducts } from "@/lib/products";

export const revalidate = 300;

export default async function HomePage() {
  const products = await getProducts();
  const featured = products.find((p) => p.featured) ?? products[0] ?? null;
  const latest = products.filter((p) => p.id !== featured?.id).slice(0, 4);
  const inCategory = (slug: string) => products.filter((p) => p.category === slug);

  return (
    <>
      <Hero product={featured} />
      <TrustStrip />

      <section className="mx-auto max-w-6xl px-5 pt-16 sm:px-8 md:pt-24" aria-labelledby="cat-title">
        <div className="mb-10 text-center">
          <h2 id="cat-title" className="text-3xl sm:text-4xl">ক্যাটাগরি অনুযায়ী দেখুন</h2>
          <p className="mt-2 text-ink-soft">শাড়ি, গহনা, কম্বো আর থ্রি-পিস — যা খুঁজছেন।</p>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-8">
          {CATEGORIES.map((c) => {
            const list = inCategory(c.slug);
            return <CategoryCard key={c.slug} category={c} count={list.length} cover={list.find((p) => p.available && p.images.length > 0) ?? list.find((p) => p.images.length > 0)} />;
          })}
        </div>
      </section>

      {latest.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 pt-16 sm:px-8 md:pt-24" aria-label="নতুন সংগ্রহ">
          <SectionHeading title="নতুন সংগ্রহ" href="/shop" linkText="সব দেখুন" />
          <ProductGrid products={latest} />
        </section>
      )}

      <div className="paar mx-auto mt-16 max-w-6xl md:mt-24" aria-hidden />

      {featured && <FeaturedProduct product={featured} />}

      <HowToOrder />

      <section className="border-t border-line">
        <div className="mx-auto max-w-2xl px-5 py-16 text-center sm:py-24">
          <Image src="/images/logo.png" alt="" width={88} height={88} className="mx-auto h-[88px] w-[88px]" />
          <p className="mt-6 font-display text-2xl leading-relaxed sm:text-3xl sm:leading-relaxed">
            দেশের তাঁতির হাতে বোনা কাপড়, আর যত্নে বেছে নেওয়া গহনা — অবয়ব সেই সহজ সৌন্দর্যকেই পৌঁছে দেয় আপনার কাছে।
          </p>
          <p className="mt-4 text-sm tracking-wide text-haldi">Wear your identity.</p>
        </div>
      </section>

      {/* sits flush on the footer (which has mt-24 for every other page) */}
      <div className="-mb-24"><FacebookCTA /></div>
    </>
  );
}
