import type { EventDTO, PublicHostProfileDTO } from "~/lib/api";
import { fetchPublic, fetchPublicList } from "~/lib/server-api";
import type { HomepageMarketingConfig } from "~/components/home/ShowcaseSections";
import HomeClient from "./HomeClient";

export const revalidate = 300;

/**
 * Server half of the home page.
 *
 * `ShowcaseSections` falls back to hardcoded marketing cards whenever its
 * queries have no data yet — and because it server-renders, those fakes were
 * being baked into the shipped HTML and swapped for real content on hydration.
 * Fetching here and seeding the client cache means the first paint is real.
 *
 * All three are fetched in parallel: none depends on another.
 */
export default async function HomePage() {
  const [events, hosts, marketingConfig] = await Promise.all([
    fetchPublicList<EventDTO>("/events/"),
    fetchPublicList<PublicHostProfileDTO>("/hosts"),
    fetchPublic<HomepageMarketingConfig>(
      "/platform-settings/homepage_marketing_config",
    ),
  ]);

  return (
    <HomeClient
      initialEvents={events}
      initialHosts={hosts}
      initialMarketingConfig={marketingConfig}
    />
  );
}
