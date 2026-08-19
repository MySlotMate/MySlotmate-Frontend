import { getPublicEvent } from "~/lib/server-api";
import ExperienceDetailClient from "./ExperienceDetailClient";

export const revalidate = 300;

export default async function ExperienceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const initialEvent = await getPublicEvent(slug);
  return <ExperienceDetailClient params={params} initialEvent={initialEvent} />;
}
