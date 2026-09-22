import Link from "next/link";
import SubmitButton from "@/components/SubmitButton";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { PRODUCT_SELECT, normalizeProduct } from "@/lib/products";
import { setProductFlag, deleteProductPermanently } from "@/app/admin/actions";
import ProductForm from "@/components/admin/ProductForm";
import ImageManager from "@/components/admin/ImageManager";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { btnQuiet } from "@/components/admin/styles";
import type { Product } from "@/types/product";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> };

export default async function EditProduct({ params, searchParams }: Props) {
  const { sb } = await requireAdmin();
  const { id } = await params;
  const { created } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data } = await sb.from("products").select(PRODUCT_SELECT).eq("id", id).maybeSingle();
  if (!data) notFound();
  const product = normalizeProduct(data as unknown as Product);

  return (
    <div className="space-y-12">
      <div>
        <Link href={product.archived ? "/admin?show=archived" : "/admin"} className="text-sm text-ink-soft hover:text-ink">← পণ্য</Link>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-2xl">
            {product.name} <span className="ml-2 font-sans text-base tabular-nums text-ink-soft">{product.product_code}</span>
          </h1>
          {!product.archived && (
            <Link href={`/product/${product.slug}`} target="_blank" className={btnQuiet}>সাইটে দেখুন</Link>
          )}
        </div>
        {created && <p className="mt-3 text-leaf">পণ্য তৈরি হয়েছে — কোড {product.product_code}।{product.images.length === 0 && " এখন ছবি যোগ করুন।"}</p>}
        {product.archived && <p className="mt-3 text-sindoor">এই পণ্যটি আর্কাইভ করা — সাইটে দেখা যায় না।</p>}
      </div>

      <ImageManager productId={product.id} productName={product.name} images={product.images} />

      <section>
        <h2 className="mb-6 text-xl">তথ্য</h2>
        <ProductForm product={product} />
      </section>

      <section className="border-t border-line pt-6">
        <h2 className="text-xl">পণ্য সরানো</h2>
        {product.archived ? (
          <div className="mt-4 flex flex-wrap gap-3">
            <form action={setProductFlag.bind(null, product.id, "archived", false)}>
              <SubmitButton className={btnQuiet}>ফিরিয়ে আনুন</SubmitButton>
            </form>
            <ConfirmButton
              action={deleteProductPermanently.bind(null, product.id)}
              message={`${product.product_code} স্থায়ীভাবে মুছে যাবে, ছবিসহ। আগের অর্ডারের রেকর্ড থেকে যাবে। নিশ্চিত?`}
              className={`${btnQuiet} !border-sindoor !text-sindoor`}
            >
              স্থায়ীভাবে মুছুন
            </ConfirmButton>
          </div>
        ) : (
          <>
            <p className="mt-1 text-sm text-ink-soft">আর্কাইভ করলে সাইট থেকে সরে যাবে, কিন্তু কোড ও অর্ডারের ইতিহাস থাকবে।</p>
            <form action={setProductFlag.bind(null, product.id, "archived", true)} className="mt-4">
              <SubmitButton className={`${btnQuiet} !text-sindoor`}>আর্কাইভ করুন</SubmitButton>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
