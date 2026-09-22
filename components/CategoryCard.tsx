import Link from "next/link";
import type { Category } from "@/lib/categories";

export default function CategoryCard({ category, count }: { category: Category; count: number }) {
  return (
    <Link
      href={`/shop?category=${category.slug}`}
      className="group flex h-full flex-col justify-between gap-6 border-t border-ink/80 pt-4 pb-2"
    >
      <div>
        <h3 className="text-2xl group-hover:text-haldi">{category.label}</h3>
        <p className="mt-1.5 text-sm text-ink-soft">{category.blurb}</p>
      </div>
      <p className="text-xs text-ink-soft">
        {count > 0 ? `${count.toLocaleString("bn-BD")}টি পণ্য` : "শীঘ্রই আসছে"}
      </p>
    </Link>
  );
}
