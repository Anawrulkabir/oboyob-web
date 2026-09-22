import Link from "next/link";

export default function SectionHeading({ title, href, linkText }: { title: string; href?: string; linkText?: string }) {
  return (
    <div className="mb-8 flex items-baseline justify-between gap-4">
      <h2 className="text-2xl sm:text-3xl">{title}</h2>
      {href && (
        <Link href={href} className="shrink-0 text-sm text-ink-soft underline decoration-line underline-offset-4 hover:text-ink">
          {linkText}
        </Link>
      )}
    </div>
  );
}
