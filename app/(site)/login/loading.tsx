export default function Loading() {
  return (
    <div className="mx-auto max-w-sm px-5 pt-12 pb-8 sm:pt-20" aria-busy="true" aria-label="লোড হচ্ছে">
      <div className="h-9 w-24 bg-paper-deep" />
      <div className="mt-3 mb-8 h-4 w-full bg-paper-deep" />
      <div className="h-12 w-full bg-paper-deep" />
      <div className="mt-3 h-12 w-full bg-paper-deep" />
    </div>
  );
}
