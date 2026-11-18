/**
 * Instant navigation boundary for the experiences listing.
 *
 * `page.tsx` awaits the event list, so without this the previous page stays on
 * screen for the round-trip. Mirrors the card grid so the swap isn't jarring.
 */
export default function Loading() {
  return (
    <div className="min-h-screen animate-pulse bg-[#080914]">
      <div className="h-16 w-full border-b border-white/10 bg-[#121426]" />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="h-8 w-1/4 rounded-lg bg-white/10" />
        <div className="mt-4 h-4 w-1/3 rounded bg-white/[0.06]" />

        {/* Filter row */}
        <div className="mt-8 flex gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 w-24 rounded-full bg-white/[0.06]" />
          ))}
        </div>

        {/* Card grid */}
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-[4/5] w-full rounded-xl bg-white/10" />
              <div className="h-4 w-3/4 rounded bg-white/[0.06]" />
              <div className="h-4 w-1/2 rounded bg-white/[0.06]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
