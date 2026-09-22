export default function Availability({ available, className = "" }: { available: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${available ? "text-leaf" : "text-sindoor"} ${className}`}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {available ? "স্টকে আছে" : "স্টক শেষ"}
    </span>
  );
}
