import { type Metadata } from "next";
import Navbar from "~/components/Navbar";
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
 * The Navbar lives here rather than inside each page so it survives the
 * `loading.tsx` boundary — `loading` replaces only the page slot, so a Navbar
 * rendered inside the page cannot appear while the event fetch is in flight.
 * Previously the skeleton drew a blank grey bar in its place.
 */
export default function ExperienceDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}
