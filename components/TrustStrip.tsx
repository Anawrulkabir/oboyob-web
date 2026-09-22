const POINTS = [
  { title: "সারা দেশে হোম ডেলিভারি", text: "ঢাকা বা ঢাকার বাইরে — দরজায় পৌঁছে যাবে", icon: "M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" },
  { title: "ফোনে কনফার্ম করে পাঠানো", text: "অর্ডারের পর আমরা আপনাকে ফোন করব", icon: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" },
  { title: "দেশীয় তাঁতের কাপড়", text: "তাঁতির হাতে বোনা, যত্নে বাছাই করা", icon: "M12 3c4 3 6 6 6 9a6 6 0 0 1-12 0c0-3 2-6 6-9zM12 9v9M9 13l3 2 3-2" },
];

export default function TrustStrip() {
  return (
    <section aria-label="কেন অবয়ব" className="border-y border-line bg-paper-deep/60">
      <ul className="mx-auto grid max-w-6xl gap-5 px-5 py-6 sm:grid-cols-3 sm:gap-8 sm:px-8 sm:py-8">
        {POINTS.map((p) => (
          <li key={p.title} className="flex items-start gap-3.5">
            <svg aria-hidden viewBox="0 0 24 24" className="mt-0.5 h-6 w-6 shrink-0 fill-none stroke-haldi" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={p.icon} /></svg>
            <div>
              <p className="font-medium leading-snug">{p.title}</p>
              <p className="text-sm text-ink-soft">{p.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
