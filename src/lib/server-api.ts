import { cache } from "react";
import { env } from "~/env";
import type { EventDTO } from "~/lib/api";

/**
 * Server-side fetch against the public API for SSR/ISR pages.
 * Mirrors the envelope handling in `apiFetch` (lib/api.ts) but uses the
 * native fetch so Next.js can cache/revalidate the response.
 */

type Envelope<T> = { success: boolean; data: T };

export async function fetchPublic<T>(
  path: string,
  revalidateSeconds = 300,
): Promise<T | null> {
  try {
    const res = await fetch(`${env.NEXT_PUBLIC_API_URL}${path}`, {
      next: { revalidate: revalidateSeconds },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as Envelope<T>;
    return json.data ?? null;
  } catch {
    return null;
  }
}

export async function fetchPublicList<T>(
  path: string,
  revalidateSeconds = 300,
): Promise<T[]> {
  const data = await fetchPublic<T[]>(path, revalidateSeconds);
  return Array.isArray(data) ? data : [];
}

/**
 * Shared, request-deduplicated read of a single public event.
 *
 * Both `experience/[slug]/layout.tsx` (generateMetadata) and
 * `experience/[slug]/page.tsx` need the same event. They previously issued two
 * separate fetches, and the observed 2.93s RSC render was almost exactly twice
 * the ~1.46s single-request latency. React's `cache()` collapses them to one
 * call per render pass by construction, rather than relying on Next's Data
 * Cache happening to match the two call sites.
 *
 * Failure behaviour matches `fetchPublic`: null, never a throw. Callers depend
 * on that — generateMetadata falls back to `{}` and the page passes null
 * through as `initialEvent`.
 */
export const getPublicEvent = cache(
  async (slug: string): Promise<EventDTO | null> =>
    fetchPublic<EventDTO>(`/events/${slug}`),
);
