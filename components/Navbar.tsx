import Image from "next/image";
import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import { site } from "@/lib/site";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur-[2px]">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5" aria-label={`${site.nameBn} — হোম`}>
          <Image src="/images/logo.png" alt="" width={40} height={40} priority className="h-10 w-10" />
          <span className="font-display text-xl leading-none">{site.nameBn}</span>
        </Link>

        <nav aria-label="প্রধান" className="hidden items-center gap-7 text-[15px] md:flex">
          <Link href="/shop" className="hover:text-haldi">সংগ্রহ</Link>
          {CATEGORIES.map((c) => (
            <Link key={c.slug} href={`/shop?category=${c.slug}`} className="text-ink-soft hover:text-ink">
              {c.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4 text-[15px]">
          <a href={site.facebook} target="_blank" rel="noopener noreferrer" className="hidden text-ink-soft hover:text-ink sm:inline">
            Facebook
          </a>
          <Link href="/account" className="text-ink-soft hover:text-ink" aria-label="আমার অ্যাকাউন্ট">
            <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.5"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>
          </Link>
          <Link href="/shop" className="border border-ink px-4 py-1.5 hover:bg-ink hover:text-paper md:hidden">
            সংগ্রহ
          </Link>
        </div>
      </div>

      {/* Mobile: categories as a scrollable second row — no JS menu needed. */}
      <nav aria-label="ক্যাটাগরি" className="no-scrollbar -mt-1 flex gap-6 overflow-x-auto px-5 pb-3 text-sm text-ink-soft md:hidden">
        {CATEGORIES.map((c) => (
          <Link key={c.slug} href={`/shop?category=${c.slug}`} className="shrink-0 hover:text-ink">
            {c.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
