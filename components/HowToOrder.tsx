const STEPS = [
  { title: "পছন্দ করুন", text: "সংগ্রহ থেকে পছন্দের পণ্যটি বেছে নিন।" },
  { title: "অর্ডার ফর্ম", text: "নাম, মোবাইল নম্বর ও ঠিকানা দিন — লগইন লাগবে না।" },
  { title: "ফোনে কনফার্ম", text: "আমরা ফোন করে অর্ডারটি নিশ্চিত করব।" },
  { title: "হোম ডেলিভারি", text: "সারা বাংলাদেশে আপনার দরজায় পৌঁছে যাবে।" },
];

export default function HowToOrder() {
  return (
    <section aria-labelledby="how-title" className="mx-auto max-w-6xl px-5 py-16 sm:px-8 md:py-24">
      <h2 id="how-title" className="text-center text-3xl sm:text-4xl">কীভাবে অর্ডার করবেন</h2>
      <ol className="mt-10 grid grid-cols-2 gap-x-5 gap-y-8 lg:grid-cols-4 lg:gap-6">
        {STEPS.map((s, i) => (
          <li key={s.title} className="relative border-t border-ink/80 pt-5">
            <span className="font-display text-4xl text-haldi">{(i + 1).toLocaleString("bn-BD")}</span>
            <p className="mt-2 text-lg font-medium">{s.title}</p>
            <p className="mt-1 text-[15px] text-ink-soft">{s.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
