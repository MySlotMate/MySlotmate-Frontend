/**
 * App-wide navigation boundary.
 *
 * Any route segment without its own `loading.tsx` falls back to this one. Its
 * job is to let a navigation *commit immediately* — without a boundary the App
 * Router keeps the previous page on screen until the next route's server data
 * resolves, which reads as "the click did nothing".
 *
 * Deliberately generic (header bar + content block). Routes with a distinctive
 * shape ship their own skeleton alongside `page.tsx`.
 */
export default function Loading() {
  return (
    <div className="min-h-screen animate-pulse bg-white">
      {/* Navbar placeholder */}
      <div className="h-16 w-full border-b border-gray-100 bg-white" />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="h-8 w-1/3 rounded-lg bg-gray-200" />
        <div className="mt-4 h-4 w-1/2 rounded bg-gray-100" />

        <div className="mt-10 space-y-4">
          <div className="h-4 w-full rounded bg-gray-100" />
          <div className="h-4 w-11/12 rounded bg-gray-100" />
          <div className="h-4 w-4/5 rounded bg-gray-100" />
        </div>
      </div>
    </div>
  );
}
