import { notFound } from "next/navigation";
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
 * Ordered Featured event ids from the Node /home feed: the same rail the
 * mobile app renders (admin picks in admin order, topped up with the soonest).
 * Null when NODE_API_URL is unset or the call fails. The Node service sleeps
 * on Render's free plan, so the timeout keeps a cold start from stalling the
 * page; the caller falls back to picking Featured itself.
 */
export async function fetchHomeFeaturedIds(): Promise<string[] | null> {
  if (!env.NODE_API_URL) return null;
  try {
    const res = await fetch(`${env.NODE_API_URL}/api/v1/home`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as Envelope<{
      featured?: { id: string }[];
    }>;
    return json.data?.featured?.map((e) => e.id) ?? null;
  } catch {
    return null;
  }
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

/** A marketing landing page (/{slug}); see app/[slug]/page.tsx. */
export type LandingPageDTO = {
  slug: string;
  event_slug: string;
  title: string;
  hook_line: string | null;
  cover_image_url: string | null;
  gallery_urls: string[];
  content: string;
  cta_text: string | null;
  seo_description: string | null;
};

const LANDING_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Unlike fetchPublic, this never maps a failure to "not found": a cold or
 * erroring backend throws (Next keeps serving the last good page / shows the
 * error page) instead of caching a 404 for a live ad landing page. Only a real
 * 404 from the API — or a path that can't be a slug, like /wp-admin probes,
 * which then never reach the backend — becomes notFound().
 */
export const getLandingPage = cache(
  async (slug: string): Promise<LandingPageDTO> => {
    if (!LANDING_SLUG_RE.test(slug)) notFound();
    const res = await fetch(
      `${env.NEXT_PUBLIC_API_URL}/marketing-pages/${slug}`,
      { next: { revalidate: 300 } },
    );
    if (res.status === 404) notFound();
    if (!res.ok) throw new Error(`landing page ${slug}: HTTP ${res.status}`);
    return ((await res.json()) as Envelope<LandingPageDTO>).data;
  },
);
