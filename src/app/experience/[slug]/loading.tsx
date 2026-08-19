/**
 * Instant navigation boundary for the experience detail route.
 *
 * `page.tsx` awaits the event fetch before rendering. Without a loading
 * boundary the App Router holds the *previous* page on screen for that whole
 * round-trip, so a click feels like nothing happened.
 *
 * Everything here is static markup on purpose. This file is a Suspense
 * fallback rendered inside `layout.tsx`, so any client component either file
 * references has to download before the skeleton can paint. Rendering the real
 * <Navbar /> (it calls useAuthState, which pulls Firebase) took the paint cost
 * from 6 chunks / 343 KB to 21 chunks / 799 KB and defeated the whole point.
 * So the header below is a static replica of the real navbar — same 4.5rem
 * height, same accent bar, same logo — rather than the real component or the
 * blank grey bar this used to draw.
 *
 * Block colours are gray-200/300 rather than gray-100/200: the lighter pair on
 * white read as a blank screen, especially with `animate-pulse` dropping them
 * to 50% opacity.
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Static replica of the real navbar — no JS, paints immediately */}
      <div className="h-[4.5rem] w-full bg-white shadow-sm">
        <div className="h-[3px] w-full bg-[#0094CA]" />
        <div className="site-x mx-auto flex h-16 w-full max-w-[77rem] items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/home/logo.png"
            alt="Myslotmate"
            className="h-10 w-auto flex-shrink-0"
          />
          <div className="hidden flex-1 items-center justify-center gap-[22px] lg:flex">
            <div className="h-3 w-14 rounded bg-gray-200" />
            <div className="h-3 w-20 rounded bg-gray-200" />
            <div className="h-3 w-16 rounded bg-gray-200" />
          </div>
          <div className="ml-auto flex items-center gap-3 lg:ml-0">
            <div className="h-9 w-24 rounded-full bg-gray-200" />
            <div className="h-9 w-9 rounded-full bg-gray-300" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Title */}
        <div className="mb-4 h-8 w-2/3 animate-pulse rounded-lg bg-gray-300" />
        <div className="mb-6 h-4 w-1/3 animate-pulse rounded bg-gray-200" />

        {/* Hero image — same 16:9 frame the real page uses */}
        <div className="aspect-[16/9] w-full animate-pulse rounded-xl bg-gray-300" />

        <div className="mt-8 flex flex-col gap-8 lg:flex-row">
          {/* Content column */}
          <div className="flex-1 space-y-4">
            <div className="h-6 w-1/3 animate-pulse rounded bg-gray-300" />
            <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-11/12 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-gray-200" />
            <div className="mt-8 h-6 w-1/4 animate-pulse rounded bg-gray-300" />
            <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
          </div>

          {/* Sticky booking card */}
          <div className="w-full lg:w-[380px]">
            <div className="space-y-4 rounded-2xl border border-gray-300 p-6">
              <div className="h-7 w-1/2 animate-pulse rounded bg-gray-300" />
              <div className="h-11 w-full animate-pulse rounded-lg bg-gray-200" />
              <div className="h-11 w-full animate-pulse rounded-lg bg-gray-200" />
              <div className="h-12 w-full animate-pulse rounded-lg bg-gray-300" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
