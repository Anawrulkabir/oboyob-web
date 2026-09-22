import Image from "next/image";
import LoginForm from "@/components/admin/LoginForm";
import { isSupabaseConfigured } from "@/lib/supabase/server";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { error } = await searchParams;
  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5">
      <Image src="/images/logo.png" alt="অবয়ব" width={72} height={72} className="mb-6 h-18 w-18" />
      <h1 className="text-2xl">অ্যাডমিন লগইন</h1>
      {!isSupabaseConfigured ? (
        <p className="mt-4 text-sindoor">Supabase কনফিগার করা হয়নি। `.env.local`-এ Supabase URL ও key দিন।</p>
      ) : (
        <>
          {error === "forbidden" && <p className="mt-4 text-sm text-sindoor">এই অ্যাকাউন্টের অ্যাডমিন অ্যাক্সেস নেই।</p>}
          <LoginForm />
        </>
      )}
    </div>
  );
}
