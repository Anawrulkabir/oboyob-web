export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-5 pt-10 sm:px-8 md:pt-14" aria-busy="true" aria-label="লোড হচ্ছে">
      <div className="mb-10 h-10 w-40 bg-paper-deep" />
      <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i}>
            <div className="aspect-[4/5] bg-paper-deep" />
            <div className="mt-3 h-4 w-2/3 bg-paper-deep" />
            <div className="mt-2 h-4 w-1/3 bg-paper-deep" />
          </li>
        ))}
      </ul>
    </div>
  );
}
