import { type Metadata } from "next";
import { env } from "~/env";

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
    const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/hosts/${slug}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return {};
    const json = (await res.json()) as {
      data: {
        first_name?: string;
        last_name?: string;
        city?: string | null;
        tagline?: string | null;
        bio?: string | null;
        avatar_url?: string | null;
      };
    };
    const host = json.data;
    const name = [host?.first_name, host?.last_name].filter(Boolean).join(" ");
    if (!name) return {};

    const title = host.city ? `${name} — Host in ${host.city}` : `${name} — Host`;
    const description = clamp(
      host.tagline ??
        host.bio ??
        `Book experiences with ${name} on MySlotMate.`,
    );

    return {
      title,
      description,
      alternates: { canonical: `/host/${slug}` },
      openGraph: {
        title: `${title} | MySlotMate`,
        description,
        url: `/host/${slug}`,
        images: host.avatar_url ? [{ url: host.avatar_url }] : undefined,
      },
    };
  } catch {
    return {};
  }
}

export default function HostDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
