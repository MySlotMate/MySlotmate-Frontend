import { type Metadata } from "next";
import { getPublicEvent } from "~/lib/server-api";

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

function clamp(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    // Shares one request with `page.tsx` via React cache() — see getPublicEvent.
    const event = await getPublicEvent(slug);
    if (!event?.title) return {};

    const description = clamp(
      event.hook_line ??
        event.description ??
        `Book ${event.title} and other unique experiences on MySlotMate.`,
    );

    return {
      title: event.title,
      description,
      alternates: { canonical: `/experience/${slug}` },
      openGraph: {
        title: `${event.title} | MySlotMate`,
        description,
        url: `/experience/${slug}`,
        images: event.cover_image_url
          ? [{ url: event.cover_image_url }]
          : undefined,
      },
    };
  } catch {
    return {};
  }
}

/**
 * Deliberately holds NO client components.
 *
 * `loading.tsx` is a Suspense fallback rendered *inside* this layout, so the
 * router must load every client chunk this layout references before it can
 * paint the skeleton. Rendering <Navbar /> here (it calls useAuthState, which
 * pulls Firebase) pushed the skeleton's paint cost from 6 chunks / 343 KB to
 * 21 chunks / 799 KB — 146 KB of it Firebase — and the instant paint was lost.
 * The Navbar therefore stays in the pages; `loading.tsx` draws a matching
 * static header instead.
 */
export default function ExperienceDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
