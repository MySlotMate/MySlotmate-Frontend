import type { BlogDTO } from "~/lib/api";
import { fetchPublicList } from "~/lib/server-api";
import BlogsClient from "./BlogsClient";

export const revalidate = 300;

export default async function BlogsPage() {
  const blogs = await fetchPublicList<BlogDTO>("/blogs?limit=1000");
  return <BlogsClient initialBlogs={blogs} />;
}
