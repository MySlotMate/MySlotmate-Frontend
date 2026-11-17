import { type Metadata } from "next";
import { env } from "~/env";

const SITE_URL = "https://www.myslotmate.com";

function clamp(text: string, max = 160): string {
  const clean = text
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

type PublicBlog = {
  title?: string | null;
  description?: string | null;
  content?: string | null;
  cover_image_url?: string | null;
  author_name?: string | null;
  published_at?: string | null;
  updated_at?: string;
};

/**
 * One fetch for both the metadata and the article markup; Next dedupes the
 * identical request within a render.
 */
async function getBlog(slug: string): Promise<PublicBlog | null> {
  try {
    // eslint-disable-next-line no-restricted-syntax -- reviewed: public endpoint or sends the auth header itself
    const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/blogs/${slug}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data: PublicBlog };
    return json.data?.title ? json.data : null;
  } catch {
    return null;
  }
}

const describe = (blog: PublicBlog) =>
  clamp(
    blog.description ??
      blog.content ??
      `Read ${blog.title} on MySlotMate Stories.`,
  );

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const blog = await getBlog(slug);
  if (!blog?.title) return {};
  const description = describe(blog);

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
}

export default async function BlogDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const blog = await getBlog(slug);

  // Article rich results: headline, image, dates and author.
  const jsonLd = blog?.title
    ? {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: blog.title,
        description: describe(blog),
        image: blog.cover_image_url ?? undefined,
        datePublished: blog.published_at ?? undefined,
        dateModified: blog.updated_at ?? blog.published_at ?? undefined,
        author: {
          "@type": blog.author_name ? "Person" : "Organization",
          name: blog.author_name?.trim() ? blog.author_name : "MySlotMate",
        },
        publisher: { "@id": `${SITE_URL}/#organization` },
        mainEntityOfPage: `${SITE_URL}/blogs/${slug}`,
        inLanguage: "en-IN",
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  );
}
