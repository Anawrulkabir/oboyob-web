"use client";

import { useEffect, useState } from "react";

/** Mobile-only bottom bar with the price and Order button; hides once the form is on screen. */
export default function StickyOrderBar({ name, price }: { name: string; price: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const form = document.getElementById("order");
    const top = document.getElementById("product-cta");
    if (!form || !top) return;
    const seen = { form: false, top: true };
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) seen[en.target === form ? "form" : "top"] = en.isIntersecting;
      setShow(!seen.form && !seen.top);
    });
    io.observe(form); io.observe(top);
    return () => io.disconnect();
  }, []);

  return (
    <div
      aria-hidden={!show}
      className={`fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-transform duration-200 md:hidden ${show ? "translate-y-0" : "translate-y-full"}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate font-display">{name}</p>
          <p className="text-sm tabular-nums text-ink-soft">{price}</p>
        </div>
        <a href="#order" tabIndex={show ? 0 : -1} className="shrink-0 bg-ink px-6 py-3 text-paper">অর্ডার করুন</a>
      </div>
    </div>
  );
}
