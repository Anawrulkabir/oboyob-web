import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import SubmitButton from "@/components/SubmitButton";
import { optOut } from "@/lib/optout";
import { verifyEmailSignature } from "@/lib/unsubscribe";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false } };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ e?: string; s?: string; done?: string }> };

// A confirm button rather than unsubscribing on page load: mail scanners
// open links automatically and would unsubscribe people by accident.
export default async function UnsubscribePage({ searchParams }: Props) {
  const { e = "", s = "", done } = await searchParams;
  const valid = !!e && verifyEmailSignature(e.toLowerCase(), s);

  async function confirm() {
    "use server";
    const ok = await optOut(e, s);
    redirect(`/unsubscribe?e=${encodeURIComponent(e)}&s=${s}&done=${ok ? 1 : 0}`);
  }

  return (
    <div className="mx-auto max-w-md px-5 pt-16 pb-8 text-center">
      <h1 className="text-3xl">নতুন পণ্যের ইমেইল</h1>
      {!valid ? (
        <p className="mt-4 text-ink-soft">লিংকটি সঠিক নয়। ইমেইলের নিচের লিংকটি আবার ব্যবহার করুন।</p>
      ) : done === "1" ? (
        <p className="mt-4 text-leaf">✓ {e} — আর নতুন পণ্যের ইমেইল পাঠানো হবে না। অর্ডারের ইমেইল আগের মতোই পাবেন।</p>
      ) : (
        <form action={confirm} className="mt-6 space-y-4">
          <p className="text-ink-soft"><span className="text-ink">{e}</span> ঠিকানায় নতুন পণ্যের খবর আর পাঠানো বন্ধ করবেন?</p>
          <SubmitButton className="bg-ink px-6 py-3 text-paper hover:bg-ink/85" pendingText="হচ্ছে…">হ্যাঁ, বন্ধ করুন</SubmitButton>
          {done === "0" && <p className="text-sm text-sindoor">হয়নি — একটু পরে আবার চেষ্টা করুন।</p>}
        </form>
      )}
      <Link href="/" className="mt-10 inline-block text-sm text-ink-soft underline underline-offset-4">হোমপেজে যান</Link>
    </div>
  );
}
