import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductGallery from "@/components/ProductGallery";
import ProductInfo from "@/components/ProductInfo";
import ProductSpecifications from "@/components/ProductSpecifications";
import OrderForm from "@/components/OrderForm";
import StickyOrderBar from "@/components/StickyOrderBar";
import { formatPrice, PRICE_ON_REQUEST } from "@/lib/format";
import { getProductBySlug, getProducts } from "@/lib/products";
import { site } from "@/lib/site";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getProducts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug);
  if (!product) return { title: "পণ্য পাওয়া যায়নি" };
  const description =
    product.description?.split(/\n\s*\n/)[0]?.slice(0, 160) ?? `${product.name} — ${product.subtitle ?? ""}`;
  const image = product.images[0];
  return {
    title: product.name,
    description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      title: `${product.name} | ${site.nameBn} — ${site.nameEn}`,
      description,
      url: `/product/${product.slug}`,
      images: image
        ? [{ url: image.image_url, alt: image.alt_text ?? product.name }]
        : [{ url: "/images/logo-large.png", alt: site.nameBn }],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const product = await getProductBySlug((await params).slug);
  if (!product) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.product_code,
    description: product.description ?? undefined,
    image: product.images.map((i) => i.image_url),
    brand: { "@type": "Brand", name: site.nameEn },
    ...(product.price != null && {
      offers: {
        "@type": "Offer",
        priceCurrency: "BDT",
        price: product.price,
        availability: product.available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      },
    }),
  };

  return (
    <article className="mx-auto max-w-6xl px-5 pt-6 sm:px-8 md:pt-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="grid gap-10 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:gap-14">
        <div className="-mx-5 sm:mx-0 md:sticky md:top-24 md:self-start">
          <ProductGallery product={product} />
        </div>

        <div className="space-y-12">
          <ProductInfo product={product} />
          <ProductSpecifications specs={product.specifications} />

          {product.available && (
            <section id="order" aria-labelledby="order-title" className="scroll-mt-24 border-t border-ink/80 pt-6">
              <h2 id="order-title" className="text-2xl">অর্ডার করুন</h2>
              <p className="mt-1 mb-6 text-sm text-ink-soft">তথ্য দিন, আমরা ফোন করে কনফার্ম করব।</p>
              <OrderForm slug={product.slug} productName={product.name} productCode={product.product_code} price={product.price} />
            </section>
          )}
        </div>
      </div>
      {product.available && <StickyOrderBar name={product.name} price={formatPrice(product.price) ?? PRICE_ON_REQUEST} />}
    </article>
  );
}
