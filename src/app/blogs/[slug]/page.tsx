import type { BlogDTO } from "~/lib/api";
import { fetchPublic } from "~/lib/server-api";
import BlogDetailClient from "./BlogDetailClient";

export const revalidate = 300;

/**
 * Server half of the story page: fetch the published story so its text is
 * rendered into the HTML. Drafts return nothing here (the API hides them from
 * anonymous requests); the client then loads them with the admin's token.
 */
export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const blog = await fetchPublic<BlogDTO>(`/blogs/${slug}`);
  return <BlogDetailClient slug={slug} initialBlog={blog} />;
}
