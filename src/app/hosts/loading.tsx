/**
 * Instant navigation boundary.
 *
 * This route is a client component that fetches its own data, so without a
 * loading file the previous page stayed on screen for the whole RSC
 * round-trip — a click appeared to do nothing, then jumped.
 */
export default function Loading() {
  return (
    <div className="min-h-screen animate-pulse bg-white">
      <div className="h-16 w-full border-b border-gray-100 bg-white" />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="h-8 w-1/4 rounded-lg bg-gray-200" />
        <div className="mt-4 h-4 w-1/3 rounded bg-gray-100" />

        <div className="mt-8 flex gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 w-24 rounded-full bg-gray-100" />
          ))}
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-[16/9] w-full rounded-xl bg-gray-200" />
              <div className="h-4 w-3/4 rounded bg-gray-100" />
              <div className="h-4 w-1/2 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
