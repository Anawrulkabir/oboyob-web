"use client";

import { site } from "@/lib/site";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-5 py-24 text-center">
      <h1 className="text-3xl">পেজটি লোড করা যায়নি</h1>
      <p className="mt-3 text-ink-soft">সংযোগে সমস্যা হয়েছে। আবার চেষ্টা করুন, অথবা Facebook পেজে যোগাযোগ করুন।</p>
      <div className="mt-8 flex justify-center gap-3">
        <button onClick={reset} className="bg-ink px-6 py-3 text-paper">আবার চেষ্টা করুন</button>
        <a href={site.facebook} target="_blank" rel="noopener noreferrer" className="border border-ink px-6 py-3">Facebook</a>
      </div>
    </div>
  );
}
