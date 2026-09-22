import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-5 py-24 text-center">
      <h1 className="text-3xl">পেজটি পাওয়া যায়নি</h1>
      <p className="mt-3 text-ink-soft">লিংকটি হয়তো পরিবর্তন হয়েছে। আমাদের সংগ্রহ থেকে খুঁজে দেখুন।</p>
      <Link href="/shop" className="mt-8 inline-block bg-ink px-6 py-3 text-paper">সংগ্রহ দেখুন</Link>
    </div>
  );
}
