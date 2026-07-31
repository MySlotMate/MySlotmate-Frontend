/**
 * Instant navigation boundary for the experience detail route.
 *
 * `page.tsx` awaits the event fetch before rendering. Without a loading
 * boundary the App Router holds the *previous* page on screen for that whole
 * round-trip, so a click feels like nothing happened. This skeleton lets the
 * navigation commit immediately and mirrors the real layout (16:9 hero,
 * content column, sticky booking card) so the swap isn't jarring.
 */
export default function Loading() {
  return (
    <div className="min-h-screen animate-pulse bg-white">
      {/* Navbar placeholder — the real Navbar lives inside the client component */}
      <div className="h-16 w-full border-b border-gray-100 bg-white" />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Title */}
        <div className="mb-4 h-8 w-2/3 rounded-lg bg-gray-200" />
        <div className="mb-6 h-4 w-1/3 rounded bg-gray-100" />

        {/* Hero image — same 16:9 frame the real page uses */}
        <div className="aspect-[16/9] w-full rounded-xl bg-gray-200" />

        <div className="mt-8 flex flex-col gap-8 lg:flex-row">
          {/* Content column */}
          <div className="flex-1 space-y-4">
            <div className="h-6 w-1/3 rounded bg-gray-200" />
            <div className="h-4 w-full rounded bg-gray-100" />
            <div className="h-4 w-11/12 rounded bg-gray-100" />
            <div className="h-4 w-4/5 rounded bg-gray-100" />
            <div className="mt-8 h-6 w-1/4 rounded bg-gray-200" />
            <div className="h-4 w-full rounded bg-gray-100" />
            <div className="h-4 w-3/4 rounded bg-gray-100" />
          </div>

          {/* Sticky booking card */}
          <div className="w-full lg:w-[380px]">
            <div className="space-y-4 rounded-2xl border border-gray-200 p-6">
              <div className="h-7 w-1/2 rounded bg-gray-200" />
              <div className="h-11 w-full rounded-lg bg-gray-100" />
              <div className="h-11 w-full rounded-lg bg-gray-100" />
              <div className="h-12 w-full rounded-lg bg-gray-200" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
