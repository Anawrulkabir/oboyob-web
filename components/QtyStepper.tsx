"use client";

/** − [n] + control. `max` caps it (stock, or 20). */
export default function QtyStepper({ value, max, onChange, size = "md", label = "পরিমাণ" }: {
  value: number; max: number; onChange: (n: number) => void; size?: "sm" | "md"; label?: string;
}) {
  const h = size === "sm" ? "h-8" : "h-11";
  const w = size === "sm" ? "w-8" : "w-10";
  return (
    <div className={`flex shrink-0 items-stretch border border-line bg-paper ${h}`}>
      <button type="button" onClick={() => onChange(Math.max(1, value - 1))} disabled={value <= 1}
        className={`${w} text-lg hover:bg-paper-deep disabled:opacity-30`} aria-label={`${label} কমান`}>−</button>
      <input type="number" min={1} max={max} value={value} aria-label={label}
        onChange={(e) => onChange(Math.min(max, Math.max(1, Number(e.target.value) || 1)))}
        className={`${size === "sm" ? "w-9 text-sm" : "w-11"} border-x border-line bg-paper text-center tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none`} />
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}
        className={`${w} text-lg hover:bg-paper-deep disabled:opacity-30`} aria-label={`${label} বাড়ান`}>+</button>
    </div>
  );
}
