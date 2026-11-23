import { getPublicEvent } from "~/lib/server-api";
import TicketsClient from "./TicketsClient";

export default async function TicketsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string; guest?: string }>;
}) {
  const [{ slug }, { date, guest }] = await Promise.all([params, searchParams]);
  const initialEvent = await getPublicEvent(slug);
  return (
    <TicketsClient
      slug={slug}
      initialEvent={initialEvent}
      initialDate={date}
      guestCheckout={guest === "1"}
    />
  );
}
