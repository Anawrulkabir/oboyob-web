/** In stock / "only N left" / sold out. `stock` is optional for callers that only know availability. */
export default function Availability({ available, stock, className = "" }: { available: boolean; stock?: number; className?: string }) {
  const low = available && stock !== undefined && stock <= 3;
  return (
    <span className={`inline-flex items-center gap-1.5 ${!available ? "text-sindoor" : low ? "text-haldi" : "text-leaf"} ${className}`}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {!available ? "Sold out · বিক্রি শেষ" : low ? `মাত্র ${stock!.toLocaleString("bn-BD")}টি বাকি` : "In Stock"}
    </span>
  );
}
