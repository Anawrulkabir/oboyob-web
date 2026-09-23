"use client";

import { useState } from "react";

/** Customer phone number with "Copy" and "Call" buttons (admin). */
export default function PhoneActions({ phone }: { phone: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(phone);
    } catch {
      // Older browsers / non-HTTPS: fall back to a hidden text field.
      const t = document.createElement("textarea");
      t.value = phone;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="font-medium tabular-nums tracking-wide">{phone}</span>
      <button type="button" onClick={copy} aria-label={`${phone} কপি করুন`}
        className={`inline-flex items-center gap-1 border px-2.5 py-1 text-xs ${copied ? "border-leaf text-leaf" : "border-line text-ink-soft hover:border-ink hover:text-ink"}`}>
        {copied ? "✓ কপি হয়েছে" : (
          <><svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="1.6"><rect x="9" y="9" width="11" height="11" rx="1.5" /><path d="M5 15V5a1 1 0 0 1 1-1h10" /></svg>কপি</>
        )}
      </button>
      <a href={`tel:${phone}`} aria-label={`${phone} নম্বরে কল করুন`}
        className="inline-flex items-center gap-1 border border-line px-2.5 py-1 text-xs text-ink-soft hover:border-ink hover:text-ink">
        <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="1.6" strokeLinejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></svg>
        কল
      </a>
    </span>
  );
}
