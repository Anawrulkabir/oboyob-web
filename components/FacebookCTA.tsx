import { site } from "@/lib/site";

export default function FacebookCTA() {
  return (
    <section className="bg-ink text-paper">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-14 sm:px-8 md:flex-row md:items-center md:justify-between md:py-16">
        <div>
          <p className="font-display text-3xl leading-snug sm:text-4xl">নতুন কালেকশন সবার আগে</p>
          <p className="mt-2 max-w-lg text-paper/70">নতুন শাড়ি ও গহনার ছবি আর দাম — আমাদের Facebook পেজে। প্রশ্ন থাকলে মেসেজ করুন।</p>
        </div>
        <a href={site.facebook} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 self-start bg-paper px-6 py-3.5 text-ink hover:bg-haldi-soft md:self-auto">
          <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 fill-[#1877F2]"><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/></svg>
          Facebook পেজে যান
        </a>
      </div>
    </section>
  );
}
