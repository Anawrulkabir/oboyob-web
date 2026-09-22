"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CATEGORIES } from "@/lib/categories";
import { site } from "@/lib/site";

// Hamburger menu: a native <dialog> slides in from the left, so focus
// trapping, Esc-to-close and the backdrop come from the browser.
export default function MenuDrawer() {
  const ref = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();

  const open = () => {
    ref.current?.showModal();
    document.documentElement.style.overflow = "hidden";
  };
  const close = () => ref.current?.close();

  // Close after navigating, and restore page scroll whenever it closes.
  useEffect(() => { close(); }, [pathname]);
  useEffect(() => {
    const d = ref.current;
    const onClose = () => { document.documentElement.style.overflow = ""; };
    d?.addEventListener("close", onClose);
    return () => d?.removeEventListener("close", onClose);
  }, []);

  return (
    <>
      <button type="button" onClick={open} aria-label="মেনু খুলুন" aria-haspopup="dialog"
        className="-ml-2 flex h-10 w-10 items-center justify-center text-ink hover:text-haldi">
        <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="1.5" strokeLinecap="round">
          <path d="M3.5 7h17M3.5 12h17M3.5 17h11" />
        </svg>
      </button>

      <dialog
        ref={ref}
        aria-label="মেনু"
        onClick={(e) => { if (e.target === e.currentTarget) close(); }} // tap on backdrop
        className="menu-drawer m-0 h-dvh max-h-none w-[86vw] max-w-sm bg-paper p-0 text-ink"
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-5">
            <span className="font-display text-2xl">{site.nameBn}</span>
            <button type="button" onClick={close} aria-label="মেনু বন্ধ করুন"
              className="-mr-2 flex h-10 w-10 items-center justify-center hover:text-haldi">
              <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="1.5" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <nav aria-label="ক্যাটাগরি" className="flex-1 overflow-y-auto px-5 py-6">
            <p className="text-xs tracking-wide text-ink-soft">ক্যাটাগরি</p>
            <ul className="mt-2 divide-y divide-line">
              {CATEGORIES.map((c) => (
                <li key={c.slug}>
                  <Link href={`/shop?category=${c.slug}`} onClick={close} className="group flex items-center justify-between gap-4 py-4">
                    <span>
                      <span className="block font-display text-2xl leading-snug group-hover:text-haldi">{c.label}</span>
                      <span className="block text-sm text-ink-soft">{c.blurb}</span>
                    </span>
                    <span aria-hidden className="text-ink-soft transition-transform group-hover:translate-x-1 group-hover:text-haldi">→</span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/shop" onClick={close} className="mt-6 block bg-ink py-3.5 text-center text-paper hover:bg-ink/85">
              সব পণ্য দেখুন
            </Link>
          </nav>

          <div className="space-y-3 border-t border-line px-5 py-5 text-[15px]">
            <Link href="/account" onClick={close} className="flex items-center gap-3 hover:text-haldi">
              <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.5"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>
              আমার অ্যাকাউন্ট ও অর্ডার
            </Link>
            <a href={site.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:text-haldi">
              <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/></svg>
              Facebook পেজে মেসেজ করুন
            </a>
            <p className="pt-1 text-sm text-ink-soft">হোম ডেলিভারি — সারা বাংলাদেশ</p>
          </div>
        </div>
      </dialog>
    </>
  );
}
