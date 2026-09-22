import Image from "next/image";
import SubmitButton from "@/components/SubmitButton";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { PRODUCT_SELECT, normalizeProduct } from "@/lib/products";
import { CATEGORIES, getCategory } from "@/lib/categories";
import { formatPrice } from "@/lib/format";
import { setProductFlag } from "@/app/admin/actions";
import { btnPrimary, btnQuiet } from "@/components/admin/styles";
import type { Product } from "@/types/product";

type Props = { searchParams: Promise<{ category?: string; show?: string; q?: string }> };

export default async function ProductsAdmin({ searchParams }: Props) {
  const { sb } = await requireAdmin();
  const { category, show, q } = await searchParams;
  const archived = show === "archived";

  let query = sb.from("products").select(PRODUCT_SELECT).eq("archived", archived).order("created_at", { ascending: false });
  if (getCategory(category)) query = query.eq("category", category!);
  if (q) query = query.or(`name.ilike.%${q.replace(/[%,()]/g, "")}%,product_code.ilike.%${q.replace(/[%,()]/g, "")}%`);
  const { data, error } = await query;
  const products = ((data ?? []) as unknown as Product[]).map(normalizeProduct);

  const tab = (label: string, params: Record<string, string>) => {
    const href = "/admin?" + new URLSearchParams(params).toString();
    const active = (params.show ?? "") === (show ?? "") && (params.category ?? "") === (category ?? "");
    return (
      <Link key={label} href={href} className={`border px-3 py-1 text-sm ${active ? "border-ink bg-ink text-paper" : "border-line text-ink-soft hover:border-ink"}`}>
        {label}
      </Link>
    );
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl">{archived ? "আর্কাইভ করা পণ্য" : "পণ্য"}</h1>
        <Link href="/admin/products/new" className={btnPrimary}>+ নতুন পণ্য</Link>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {tab("সব", {})}
        {CATEGORIES.map((c) => tab(c.label, { category: c.slug }))}
        {tab("আর্কাইভ", { show: "archived" })}
        <form className="ml-auto">
          {category && <input type="hidden" name="category" value={category} />}
          {archived && <input type="hidden" name="show" value="archived" />}
          <input name="q" defaultValue={q} placeholder="নাম বা কোড খুঁজুন" className="border border-line bg-paper px-3 py-1 text-sm outline-none focus:border-ink" />
        </form>
      </div>

      {error && <p className="mt-6 text-sindoor">লোড করা যায়নি: {error.message}</p>}

      {products.length === 0 ? (
        <p className="mt-10 border-t border-line pt-10 text-center text-ink-soft">
          {archived ? "কোনো আর্কাইভ করা পণ্য নেই।" : "কোনো পণ্য নেই। “+ নতুন পণ্য” দিয়ে যোগ করুন।"}
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-line border-y border-line">
          {products.map((p) => (
            <li key={p.id} className="grid grid-cols-[56px_1fr] gap-x-4 gap-y-3 py-4 md:grid-cols-[56px_1fr_auto] md:items-center">
              <div className="relative h-[70px] w-14 bg-paper-deep">
                {p.images[0] ? (
                  <Image src={p.images[0].image_url} alt="" fill sizes="56px" className="object-cover" />
                ) : (
                  <div className="weave h-full w-full" />
                )}
              </div>
              <div className="min-w-0">
                <Link href={`/admin/products/${p.id}`} className="font-display text-lg hover:text-haldi">{p.name}</Link>
                <p className="text-sm text-ink-soft">
                  <span className="tabular-nums text-ink">{p.product_code}</span> / {getCategory(p.category)?.label} /{" "}
                  {formatPrice(p.price) ?? <span className="text-sindoor">দাম নেই</span>} / {p.images.length}টি ছবি
                </p>
              </div>
              <div className="col-span-2 flex flex-wrap gap-2 md:col-span-1 md:justify-end">
                {archived ? (
                  <form action={setProductFlag.bind(null, p.id, "archived", false)}>
                    <SubmitButton className={btnQuiet}>ফিরিয়ে আনুন</SubmitButton>
                  </form>
                ) : (
                  <>
                    <form action={setProductFlag.bind(null, p.id, "available", !p.available)}>
                      <SubmitButton className={`${btnQuiet} ${p.available ? "!text-leaf" : "!text-sindoor"}`}>
                        {p.available ? "● স্টকে আছে" : "○ স্টক শেষ"}
                      </SubmitButton>
                    </form>
                    <form action={setProductFlag.bind(null, p.id, "featured", !p.featured)}>
                      <SubmitButton className={`${btnQuiet} ${p.featured ? "!border-haldi !text-haldi" : ""}`}>
                        {p.featured ? "★ ফিচার্ড" : "☆ ফিচার্ড"}
                      </SubmitButton>
                    </form>
                    <Link href={`/product/${p.slug}`} target="_blank" className={btnQuiet}>দেখুন</Link>
                  </>
                )}
                <Link href={`/admin/products/${p.id}`} className={btnQuiet}>এডিট</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
