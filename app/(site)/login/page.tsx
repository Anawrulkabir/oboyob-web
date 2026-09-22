import type { Metadata } from "next";
import Link from "next/link";
import LoginPanel from "@/components/LoginPanel";
import { authFeatures } from "@/lib/features";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "লগইন", robots: { index: false } };

type Props = { searchParams: Promise<{ next?: string; error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { next, error } = await searchParams;
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/account";
  return (
    <div className="mx-auto max-w-sm px-5 pt-12 pb-8 sm:pt-20">
      <h1 className="text-3xl">লগইন</h1>
      <p className="mt-2 mb-8 text-ink-soft">অর্ডার ট্র্যাক করুন, আর পরের বার ঠিকানা লিখতে হবে না।</p>
      {isSupabaseConfigured ? (
        <LoginPanel next={safeNext} phone={authFeatures.phone} facebook={authFeatures.facebook} error={error} />
      ) : (
        <p className="text-sindoor">লগইন এখনও চালু হয়নি।</p>
      )}
      <p className="mt-10 border-t border-line pt-5 text-sm text-ink-soft">
        লগইন ছাড়াও অর্ডার করা যায়। <Link href="/shop" className="text-ink underline underline-offset-4">সংগ্রহ দেখুন</Link>
      </p>
    </div>
  );
}
