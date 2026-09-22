import type { Metadata } from "next";
import CheckoutForm from "@/components/CheckoutForm";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "চেকআউট", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 pt-8 sm:px-8 md:pt-12">
      <h1 className="text-3xl sm:text-4xl">চেকআউট</h1>
      <ol className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink-soft" aria-label="ধাপ">
        <li className="text-ink">১. কার্ট</li><li aria-hidden>→</li>
        <li className="text-ink">২. ডেলিভারি ও পেমেন্ট</li><li aria-hidden>→</li>
        <li>৩. পেমেন্ট স্লিপ</li>
      </ol>
      <CheckoutForm enabled={isSupabaseConfigured} />
    </div>
  );
}
