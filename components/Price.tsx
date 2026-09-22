import { formatPrice, PRICE_ON_REQUEST } from "@/lib/format";

export default function Price({ value, className = "" }: { value: number | null; className?: string }) {
  const text = formatPrice(value);
  return text ? (
    <span className={`tabular-nums ${className}`}>{text}</span>
  ) : (
    <span className={`text-ink-soft ${className}`}>{PRICE_ON_REQUEST}</span>
  );
}
