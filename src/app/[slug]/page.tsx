import type { Metadata } from "next";
import ExperienceDetailClient from "~/app/experience/[slug]/ExperienceDetailClient";
import { getLandingPage, getPublicEvent } from "~/lib/server-api";

/**
 * Marketing landing pages at the site root (/{slug}), edited in the admin
 * panel's "Event marketing" section. They render exactly like the linked
 * event's page (/experience/{event_slug}) — same layout, dates, location,
 * price, reviews and booking, all live from the event — but with marketing's
 * own title, hook line, description and photos (an independent copy).
 *
 * Next.js serves every static route and public/ file before this dynamic
 * segment, so /about, /blogs etc. are unaffected. The backend refuses those
 * names as slugs (reservedRootSlugs in marketing_page_controller.go) — add new
 * top-level routes there too.
 */

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await getLandingPage((await params).slug);
  const description = page.seo_description ?? page.hook_line ?? undefined;
  return {
    title: page.title,
    description,
    alternates: { canonical: `/${page.slug}` },
    openGraph: {
      title: `${page.title} | Myslotmate`,
      description,
      url: `/${page.slug}`,
      images: page.cover_image_url
        ? [{ url: page.cover_image_url }]
        : undefined,
    },
  };
}

export default async function LandingPageRoute({ params }: Props) {
  const page = await getLandingPage((await params).slug);
  const initialEvent = await getPublicEvent(page.event_slug);
  return (
    // The event page reads the event by this slug and builds its booking
    // links from it, so hand it the event's slug, not the landing page's.
    <ExperienceDetailClient
      params={Promise.resolve({ slug: page.event_slug })}
      initialEvent={initialEvent}
      contentOverride={{
        title: page.title,
        hook_line: page.hook_line,
        description: page.content,
        cover_image_url: page.cover_image_url,
        gallery_urls: page.gallery_urls,
        cta_text: page.cta_text,
      }}
    />
  );
}
