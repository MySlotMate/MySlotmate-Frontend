/**
 * Instant navigation boundary for the host profile route. Static markup only —
 * see the experience route's loading.tsx for why no client components here.
 * The real sidebar lives in the root layout.
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-[#080914] md:pl-20 min-[90rem]:pl-[230px]">
      <div className="mx-auto max-w-[1210px] animate-pulse px-6 pt-6 md:px-10 md:pt-10">
        <div className="grid gap-10 lg:grid-cols-[400px_minmax(0,1fr)] lg:gap-12">
          <div className="flex flex-col items-center gap-3">
            <div className="h-24 w-24 rounded-full bg-white/10" />
            <div className="h-7 w-44 rounded bg-white/10" />
            <div className="h-4 w-28 rounded bg-white/[0.06]" />
            <div className="mt-4 h-40 w-full rounded-2xl bg-white/[0.06]" />
          </div>
          <div className="flex flex-col gap-4">
            <div className="h-6 w-40 rounded bg-white/10" />
            <div className="h-24 w-full rounded-2xl bg-white/[0.06]" />
            <div className="h-24 w-full rounded-2xl bg-white/[0.06]" />
          </div>
        </div>
      </div>
    </div>
  );
}
