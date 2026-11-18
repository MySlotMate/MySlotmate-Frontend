/**
 * Instant navigation boundary for the blogs listing.
 *
 * `page.tsx` awaits the post list; this lets the navigation commit right away.
 */
export default function Loading() {
  return (
    <div className="min-h-screen animate-pulse bg-[#080914]">
      <div className="h-16 w-full border-b border-white/10 bg-[#121426]" />

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="h-8 w-1/4 rounded-lg bg-white/10" />

        <div className="mt-10 space-y-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-5">
              <div className="h-28 w-44 shrink-0 rounded-xl bg-white/10" />
              <div className="flex-1 space-y-3 py-1">
                <div className="h-5 w-2/3 rounded bg-white/10" />
                <div className="h-4 w-full rounded bg-white/[0.06]" />
                <div className="h-4 w-1/3 rounded bg-white/[0.06]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
