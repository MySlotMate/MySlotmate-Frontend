/**
 * Instant navigation boundary for the public host profile route.
 *
 * Same reasoning as the experience detail route: `page.tsx` awaits the host
 * fetch, so without this the previous page stays on screen for the whole
 * round-trip and the click feels dead.
 */
export default function Loading() {
  return (
    <div className="min-h-screen animate-pulse bg-white">
      <div className="h-16 w-full border-b border-gray-100 bg-white" />

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Avatar + name */}
        <div className="flex items-center gap-5">
          <div className="h-24 w-24 rounded-full bg-gray-200" />
          <div className="flex-1 space-y-3">
            <div className="h-7 w-1/3 rounded bg-gray-200" />
            <div className="h-4 w-1/4 rounded bg-gray-100" />
          </div>
        </div>

        {/* Bio */}
        <div className="mt-8 space-y-3">
          <div className="h-4 w-full rounded bg-gray-100" />
          <div className="h-4 w-5/6 rounded bg-gray-100" />
        </div>

        {/* Experience grid */}
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
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
