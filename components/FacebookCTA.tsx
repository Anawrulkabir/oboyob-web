import { site } from "@/lib/site";

export default function FacebookCTA() {
  return (
    <section className="mx-auto max-w-6xl px-5 sm:px-8">
      <div className="flex flex-col gap-5 border-y border-line py-10 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-display text-xl sm:text-2xl">আরও দেখতে আমাদের Facebook Page-এ আসুন</p>
        <a
          href={site.facebook}
          target="_blank"
          rel="noopener noreferrer"
          className="self-start border border-ink px-5 py-2.5 text-[15px] hover:bg-ink hover:text-paper sm:self-auto"
        >
          Visit Facebook Page
        </a>
      </div>
    </section>
  );
}
