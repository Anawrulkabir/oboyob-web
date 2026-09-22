import Image from "next/image";
import SubmitButton from "@/components/SubmitButton";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { signOut } from "@/app/admin/actions";

// Always per-request: depends on the signed-in user.
export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAdmin();
  return (
    <>
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3 sm:px-8">
          <Link href="/admin" className="flex items-center gap-2">
            <Image src="/images/logo.png" alt="" width={32} height={32} />
            <span className="font-display text-lg">অবয়ব</span>
            <span className="text-sm text-ink-soft">Admin</span>
          </Link>
          <nav className="flex gap-5">
            <Link href="/admin" className="hover:text-haldi">পণ্য</Link>
            <Link href="/admin/orders" className="hover:text-haldi">অর্ডার</Link>
            <Link href="/" target="_blank" className="text-ink-soft hover:text-ink">সাইট দেখুন</Link>
          </nav>
          <form action={signOut} className="ml-auto flex items-center gap-3 text-sm text-ink-soft">
            <span className="hidden sm:inline">{user.email}</span>
            <SubmitButton className="underline underline-offset-4 hover:text-ink">লগআউট</SubmitButton>
          </form>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">{children}</div>
    </>
  );
}
