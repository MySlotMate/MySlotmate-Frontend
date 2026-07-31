import { type Metadata } from "next";
import { env } from "~/env";

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
    const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/events/${slug}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return {};
    const json = (await res.json()) as {
      data: {
        title?: string;
        hook_line?: string | null;
        description?: string | null;
        cover_image_url?: string | null;
      };
    };
    const event = json.data;
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

export default function ExperienceDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
