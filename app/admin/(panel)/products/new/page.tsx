import Link from "next/link";
import ProductForm from "@/components/admin/ProductForm";

// Creating a product can also email past customers about it (runs after the response).
export const maxDuration = 60;

export default function NewProduct() {
  return (
    <div>
      <Link href="/admin" className="text-sm text-ink-soft hover:text-ink">← পণ্য</Link>
      <h1 className="mt-2 mb-2 text-2xl">নতুন পণ্য</h1>
      <p className="mb-8 text-sm text-ink-soft">ছবি, তথ্য ও স্টক দিন — পাশে (ফোনে “প্রিভিউ দেখুন” চাপলে) দেখবেন গ্রাহকরা পণ্যটি কেমন দেখবেন।</p>
      <ProductForm />
    </div>
  );
}
