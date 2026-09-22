export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-5 pt-10 sm:px-8 md:pt-14" aria-busy="true" aria-label="লোড হচ্ছে">
      <div className="h-9 w-56 bg-paper-deep" />
      <div className="mt-3 h-4 w-40 bg-paper-deep" />
      <div className="mt-10 h-6 w-32 bg-paper-deep" />
      <ul className="mt-4 divide-y divide-line border-y border-line">
        {Array.from({ length: 2 }).map((_, i) => (
          <li key={i} className="py-5">
            <div className="h-5 w-2/3 bg-paper-deep" />
            <div className="mt-4 h-1 w-full bg-paper-deep" />
          </li>
        ))}
      </ul>
    </div>
  );
}
