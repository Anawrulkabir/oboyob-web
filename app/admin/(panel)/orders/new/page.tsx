import Link from "next/link";
import AdminOrderForm, { type OrderProduct } from "@/components/admin/AdminOrderForm";
import { requireAdmin } from "@/lib/admin";

// Order on behalf of a customer who ordered on Facebook, phone, WhatsApp or in person.
export default async function NewAdminOrder() {
  const { sb } = await requireAdmin();
  const { data } = await sb.from("products").select("id, name, product_code, price, stock, archived")
    .order("archived").order("created_at", { ascending: false });
  const products: OrderProduct[] = (data ?? []).map((p) => ({
    id: p.id, name: p.name, code: p.product_code, price: p.price, stock: p.stock, archived: p.archived,
  }));

  return (
    <div>
      <Link href="/admin/orders" className="text-sm text-ink-soft hover:text-ink">← অর্ডার</Link>
      <h1 className="mt-2 text-2xl">নতুন অর্ডার (গ্রাহকের হয়ে)</h1>
      <p className="mt-1 mb-8 text-sm text-ink-soft">Facebook, ফোন বা দোকানে অর্ডার নিলে এখানে তুলে রাখুন — দাম দরদাম অনুযায়ী বদলানো যাবে।</p>
      <AdminOrderForm products={products} />
    </div>
  );
}
