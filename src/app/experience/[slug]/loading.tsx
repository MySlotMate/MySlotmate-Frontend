/**
 * Instant navigation boundary for the experience detail route.
 *
 * `page.tsx` awaits the event fetch before rendering. Without a loading
 * boundary the App Router holds the *previous* page on screen for that whole
 * round-trip, so a click feels like nothing happened.
 *
 * Everything here is static markup on purpose. This file is a Suspense
 * fallback rendered inside `layout.tsx`, so any client component either file
 * references has to download before the skeleton can paint (the real Navbar
 * pulls Firebase: 6 chunks / 343 KB became 21 chunks / 799 KB). The real sidebar
 * lives in the root layout, so it stays visible while this paints.
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-[#080914] md:pl-20 min-[80rem]:pl-[230px]">
      <div className="mx-auto max-w-[1216px] animate-pulse md:px-10 md:pt-10">
        <div className="mb-5 hidden h-4 w-20 rounded bg-white/10 md:block" />
        <div className="h-[260px] w-full bg-white/[0.06] md:h-[300px] md:rounded-[20px] lg:h-[380px]" />

        <div className="px-6 md:px-0">
          <div className="mt-5 h-5 w-16 rounded-full bg-white/10" />
          <div className="mt-3 h-7 w-2/3 rounded-lg bg-white/10" />
          <div className="mt-2 h-4 w-1/3 rounded bg-white/[0.06]" />

          <div className="mt-10 flex flex-col gap-8 lg:flex-row">
            <div className="flex-1 space-y-3">
              <div className="h-10 w-1/2 rounded-full bg-white/[0.06]" />
              <div className="mt-6 h-5 w-1/3 rounded bg-white/10" />
              <div className="h-4 w-full rounded bg-white/[0.06]" />
              <div className="h-4 w-11/12 rounded bg-white/[0.06]" />
              <div className="h-4 w-4/5 rounded bg-white/[0.06]" />
            </div>
            <div className="hidden h-[320px] w-[320px] rounded-[20px] bg-white/[0.06] lg:block" />
          </div>
        </div>
      </div>
    </div>
  );
}
