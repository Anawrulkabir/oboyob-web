import Image from "next/image";
import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import { site } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="flex items-start gap-4">
          <Image src="/images/logo.png" alt="" width={62} height={80} className="h-20 w-auto" />
          <div>
            <p className="font-display text-xl">{site.nameBn}</p>
            <p className="text-sm text-ink-soft">{site.nameEn} · {site.tagline}</p>
            <p className="mt-3 text-sm text-ink-soft">হোম ডেলিভারি — সারা বাংলাদেশ</p>
          </div>
        </div>

        <nav aria-label="ফুটার ক্যাটাগরি" className="text-sm">
          <p className="mb-3 text-ink-soft">সংগ্রহ</p>
          <ul className="space-y-1.5">
            <li><Link href="/shop" className="hover:text-haldi">সব পণ্য</Link></li>
            {CATEGORIES.map((c) => (
              <li key={c.slug}><Link href={`/shop?category=${c.slug}`} className="hover:text-haldi">{c.label}</Link></li>
            ))}
          </ul>
        </nav>

        <div className="text-sm">
          <p className="mb-3 text-ink-soft">যোগাযোগ</p>
          <p>অর্ডার ও জিজ্ঞাসার জন্য Facebook পেজে মেসেজ করুন।</p>
          <a href={site.facebook} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block underline decoration-line underline-offset-4 hover:decoration-haldi">
            Facebook Page
          </a>
        </div>
      </div>
      <div className="paar" aria-hidden />
      <p className="mx-auto max-w-6xl px-5 py-5 text-xs text-ink-soft sm:px-8">
        © {new Date().getFullYear()} {site.nameBn} — {site.nameEn}
      </p>
    </footer>
  );
}
