import type { EventDTO } from "~/lib/api";
import { fetchPublicList } from "~/lib/server-api";
import ExperiencesClient from "./ExperiencesClient";

export const revalidate = 300;

export default async function ExperiencesPage() {
  const events = await fetchPublicList<EventDTO>("/events/");
  return <ExperiencesClient initialEvents={events} />;
}
