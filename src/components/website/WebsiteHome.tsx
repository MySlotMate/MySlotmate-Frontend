"use client";

import { useMemo } from "react";
import { useListHosts, useListPublicEvents } from "~/hooks/useApi";
import type { EventDTO, PublicHostProfileDTO } from "~/lib/api";
import AnimatedHero from "./AnimatedHero";
import DiscoverGrid from "./DiscoverGrid";
import HostBand from "./HostBand";
import StoriesTeaser from "./StoriesTeaser";
import WebsiteFooter from "./WebsiteFooter";
import WebsiteNav from "./WebsiteNav";
import { upcomingEvents } from "./shared";

/**
 * The public homepage logged-out visitors see at `/` (Offlyn-style: the
 * product first). Logged-in users get the app feed instead — see HomeClient.
 */
export default function WebsiteHome({
  initialEvents,
  initialHosts,
}: {
  initialEvents?: EventDTO[];
  initialHosts?: PublicHostProfileDTO[];
}) {
  const { data: events } = useListPublicEvents(
    initialEvents ? { success: true, data: initialEvents } : undefined,
  );
  const { data: hosts } = useListHosts(
    initialHosts ? { success: true, data: initialHosts } : undefined,
  );

  const upcoming = useMemo(() => upcomingEvents(events), [events]);
  const hostById = useMemo(
    () => new Map((hosts ?? []).map((h) => [h.id, h])),
    [hosts],
  );

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#080914] font-[family-name:var(--font-inter)] text-white">
      <div className="relative">
        <WebsiteNav />
        <AnimatedHero events={upcoming} hostById={hostById} />
      </div>
      <DiscoverGrid events={upcoming} hostById={hostById} />
      <HostBand />
      <StoriesTeaser />
      <WebsiteFooter />
    </div>
  );
}
