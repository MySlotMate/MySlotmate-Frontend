import { env } from "~/env";

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
