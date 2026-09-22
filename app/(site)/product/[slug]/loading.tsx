export default function Loading() {
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-5 pt-6 sm:px-8 md:grid-cols-[1.15fr_1fr] md:pt-12" aria-busy="true" aria-label="লোড হচ্ছে">
      <div className="aspect-[4/5] bg-paper-deep" />
      <div className="space-y-4">
        <div className="h-4 w-20 bg-paper-deep" />
        <div className="h-12 w-2/3 bg-paper-deep" />
        <div className="h-6 w-1/3 bg-paper-deep" />
        <div className="h-24 w-full bg-paper-deep" />
      </div>
    </div>
  );
}
