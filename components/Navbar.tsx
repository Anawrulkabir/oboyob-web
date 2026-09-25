import Image from "next/image";
import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import { site } from "@/lib/site";
import MenuDrawer from "./MenuDrawer";
import CartDrawer from "./CartDrawer";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur-[2px]">
      <div className="mx-auto grid h-16 max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-5 sm:px-8">
        <div className="flex items-center gap-6">
          <MenuDrawer />
          <nav aria-label="প্রধান" className="hidden items-center gap-6 text-[15px] lg:flex">
            <Link href="/shop" className="hover:text-haldi">সংগ্রহ</Link>
            {CATEGORIES.map((c) => (
              <Link key={c.slug} href={`/shop?category=${c.slug}`} className="text-ink-soft hover:text-ink">
                {c.label}
              </Link>
            ))}
          </nav>
        </div>

        <Link href="/" className="flex items-center gap-2.5" aria-label={`${site.nameBn} — হোম`}>
          <Image src="/images/logo-mark.png" alt="" width={44} height={44} priority className="h-10 w-10 sm:h-11 sm:w-11" />
          <span className="font-display text-2xl leading-none">{site.nameBn}</span>
        </Link>

        <div className="flex items-center justify-end gap-1 text-[15px] sm:gap-3">
          <a href={site.facebook} target="_blank" rel="noopener noreferrer" className="hidden text-ink-soft hover:text-ink md:inline">
            Facebook
          </a>
          <Link href="/account" className="flex h-10 w-10 items-center justify-center text-ink hover:text-haldi" aria-label="আমার অ্যাকাউন্ট">
            <svg aria-hidden viewBox="0 0 24 24" className="h-[22px] w-[22px] fill-none stroke-current" strokeWidth="1.5"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>
          </Link>
          <div className="-mr-2"><CartDrawer /></div>
        </div>
      </div>
    </header>
  );
}
