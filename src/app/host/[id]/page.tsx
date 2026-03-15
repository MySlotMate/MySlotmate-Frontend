"use client";

import { use, useMemo } from "react";
import {
  ProfileHeader,
  PhotoGallery,
  StatsBar,
  AboutSection,
  RatingsSection,
  ExperiencesList,
} from "~/components/host";
import { Navbar } from "~/components";
import { FiChevronRight } from "react-icons/fi";
import Link from "next/link";
import {
  usePublicHostProfile,
  useEventsByHost,
  useReviewsByEvent,
} from "~/hooks/useApi";

export const runtime = "edge";

export default function HostProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: _hostId } = use(params);

  const { data: host, isLoading: hostLoading } = usePublicHostProfile(_hostId);
  const { data: events } = useEventsByHost(_hostId);

  // Pick the first event's reviews as representative reviews for the host
  const firstEventId = events?.[0]?.id ?? null;
  const { data: reviewsEnvelope } = useReviewsByEvent(firstEventId);
  const reviews = reviewsEnvelope ?? [];

  // Derive gallery from all event cover images + gallery URLs
  const galleryUrls = useMemo(() => {
    if (!events) return [];
    const urls: string[] = [];
    for (const evt of events) {
      if (evt.cover_image_url) urls.push(evt.cover_image_url);
      if (evt.gallery_urls) urls.push(...evt.gallery_urls);
    }
    return urls;
  }, [events]);

  // Derive aggregate stats from events
  const totalEvents = events?.length ?? 0;
  const totalPeopleMet = useMemo(
    () => events?.reduce((sum, e) => sum + (e.total_bookings ?? 0), 0) ?? 0,
    [events],
  );

  // Derive moods from events
  const moods = useMemo(() => {
    if (!events) return [];
    const set = new Set<string>();
    for (const evt of events) {
      if (evt.mood) set.add(evt.mood);
    }
    return Array.from(set);
  }, [events]);

  if (hostLoading || !host) {
    return (
      <main className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0094CA] border-t-transparent" />
        </div>
      </main>
    );
  }

  const fullName = `${host.first_name} ${host.last_name}`;

  return (
    <main className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1 text-sm text-gray-400">
          <Link href="/" className="hover:text-[#0094CA]">
            Home
          </Link>
          <FiChevronRight className="h-3 w-3" />
          <Link href="/" className="hover:text-[#0094CA]">
            Interesting people near you
          </Link>
          <FiChevronRight className="h-3 w-3" />
          <span className="font-medium text-gray-700">{fullName}</span>
        </nav>

        {/* Profile Header */}
        <ProfileHeader host={host} />

        {/* Gallery */}
        {galleryUrls.length > 0 && (
          <div className="mt-6">
            <PhotoGallery images={galleryUrls} />
          </div>
        )}
        {galleryUrls.length > 0 && (
          <div className="mt-6">
            <PhotoGallery images={galleryUrls} />
          </div>
        )}

        {/* Stats */}
        <div className="mt-6">
          <StatsBar
            total_events_hosted={totalEvents}
            total_people_met={totalPeopleMet}
            avg_rating={host.avg_rating ?? 0}
          />
        </div>

        {/* About + Ratings side by side */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <AboutSection
              first_name={host.first_name}
              bio={host.bio}
              expertise_tags={host.expertise_tags}
              moods={moods}
            />
          </div>
          <div className="lg:col-span-2">
            <RatingsSection
              avg_rating={host.avg_rating ?? 0}
              total_reviews={host.total_reviews}
              reviews={reviews}
            />
          </div>
        </div>

        {/* Live & Upcoming Experiences */}
        {events && events.length > 0 && (
          <div className="mt-10 mb-12">
            <ExperiencesList events={events} />
          </div>
        )}
        {events && events.length > 0 && (
          <div className="mt-10 mb-12">
            <ExperiencesList events={events} />
          </div>
        )}
      </div>
    </main>
  );
}
