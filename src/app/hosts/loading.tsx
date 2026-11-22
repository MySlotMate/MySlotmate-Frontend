/**
 * Instant navigation boundary.
 *
 * This route is a client component that fetches its own data, so without a
 * loading file the previous page stayed on screen for the whole RSC
 * round-trip — a click appeared to do nothing, then jumped.
 */
export default function Loading() {
  return (
    <div className="min-h-screen animate-pulse bg-[#080914]">
      <div className="h-16 w-full border-b border-white/10 bg-[#121426]" />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="h-8 w-1/4 rounded-lg bg-white/10" />
        <div className="mt-4 h-4 w-1/3 rounded bg-white/[0.06]" />

        <div className="mt-8 flex gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 w-24 rounded-full bg-white/[0.06]" />
          ))}
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-square w-full rounded-xl bg-white/10" />
              <div className="h-4 w-3/4 rounded bg-white/[0.06]" />
              <div className="h-4 w-1/2 rounded bg-white/[0.06]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
