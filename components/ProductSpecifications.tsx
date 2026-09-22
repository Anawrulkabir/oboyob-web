import type { ProductSpec } from "@/types/product";

export default function ProductSpecifications({ specs }: { specs: ProductSpec[] }) {
  if (specs.length === 0) return null;
  return (
    <section aria-labelledby="specs-title">
      <h2 id="specs-title" className="text-lg">বিবরণ</h2>
      <dl className="mt-3 divide-y divide-line border-y border-line text-[15px]">
        {specs.map((s) => (
          <div key={s.label} className="grid grid-cols-[9rem_1fr] gap-4 py-2.5">
            <dt className="text-ink-soft">{s.label}</dt>
            <dd>{s.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
