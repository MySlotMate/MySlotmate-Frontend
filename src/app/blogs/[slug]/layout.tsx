import { type Metadata } from "next";
import { env } from "~/env";

function clamp(text: string, max = 160): string {
  const clean = text
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/blogs/${slug}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return {};
    const json = (await res.json()) as {
      data: {
        title?: string | null;
        description?: string | null;
        content?: string | null;
        cover_image_url?: string | null;
        published_at?: string | null;
        updated_at?: string;
      };
    };
    const blog = json.data;
    if (!blog?.title) return {};

    const description = clamp(
      blog.description ??
        blog.content ??
        `Read ${blog.title} on the MySlotMate blog.`,
    );

    return {
      title: blog.title,
      description,
      alternates: { canonical: `/blogs/${slug}` },
      openGraph: {
        type: "article",
        title: `${blog.title} | MySlotMate`,
        description,
        url: `/blogs/${slug}`,
        publishedTime: blog.published_at ?? undefined,
        modifiedTime: blog.updated_at,
        images: blog.cover_image_url
          ? [{ url: blog.cover_image_url }]
          : undefined,
      },
    };
  } catch {
    return {};
  }
}

export default function BlogDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
