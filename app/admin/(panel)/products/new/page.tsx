import Link from "next/link";
import ProductForm from "@/components/admin/ProductForm";

export default function NewProduct() {
  return (
    <div>
      <Link href="/admin" className="text-sm text-ink-soft hover:text-ink">← পণ্য</Link>
      <h1 className="mt-2 mb-2 text-2xl">নতুন পণ্য</h1>
      <p className="mb-8 text-sm text-ink-soft">তৈরি করার পর ছবি যোগ করতে পারবেন।</p>
      <ProductForm />
    </div>
  );
}
