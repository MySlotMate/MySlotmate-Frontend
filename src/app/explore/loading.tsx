/**
 * Instant navigation boundary.
 *
 * This route is a client component that fetches its own data, so without a
 * loading file the previous page stayed on screen for the whole RSC
 * round-trip — a click appeared to do nothing, then jumped.
 */
export default function Loading() {
  return (
    <div className="min-h-screen animate-pulse bg-[#080914] md:pl-20 min-[90rem]:pl-[230px]">
      <div className="mx-auto max-w-[1210px] px-6 pt-6 md:px-10 md:pt-10">
        <div className="h-9 w-40 rounded-lg bg-white/10" />
        <div className="mt-2 h-4 w-56 rounded bg-white/5" />
        <div className="mt-7 h-12 w-full rounded-3xl bg-white/5" />
        <div className="mt-7 h-10 w-full max-w-[342px] rounded-[20px] bg-white/5" />

        <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[268px] rounded-2xl bg-white/5" />
          ))}
        </div>
      </div>
    </div>
  );
}
