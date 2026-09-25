import Image from "next/image";
import LoginForm from "@/components/admin/LoginForm";
import SubmitButton from "@/components/SubmitButton";
import { signInWithOAuth } from "@/app/actions/auth";
import { authFeatures } from "@/lib/features";
import { isSupabaseConfigured } from "@/lib/supabase/server";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { error } = await searchParams;
  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5">
      <Image src="/images/logo.png" alt="জীনাহ — Zeenah" width={93} height={120} className="mb-6 h-[120px] w-auto" />
      <h1 className="text-2xl">অ্যাডমিন লগইন</h1>
      {!isSupabaseConfigured ? (
        <p className="mt-4 text-sindoor">Supabase কনফিগার করা হয়নি। `.env.local`-এ Supabase URL ও key দিন।</p>
      ) : (
        <>
          {error === "forbidden" && <p className="mt-4 text-sm text-sindoor">এই অ্যাকাউন্টের অ্যাডমিন অ্যাক্সেস নেই।</p>}
          <LoginForm />
          {authFeatures.google && (
            <form action={signInWithOAuth} className="mt-4">
              {/* Lands on /account, which forwards admins to /admin. */}
              <input type="hidden" name="provider" value="google" />
              <input type="hidden" name="next" value="/account" />
              <SubmitButton className="w-full border border-line bg-white py-3 text-[#1f1f1f] hover:bg-[#f7f7f7]" pendingText="অপেক্ষা করুন…">
                Google দিয়ে লগইন
              </SubmitButton>
            </form>
          )}
        </>
      )}
    </div>
  );
}
