"use client";

import { use, useMemo, useRef, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "~/utils/firebase";
import {
  ProfileHeader,
  PhotoGallery,
  StatsBar,
  AboutSection,
  RatingsSection,
  ExperiencesList,
} from "~/components/host";
import { Navbar, Breadcrumb } from "~/components";
import { ReviewsModal } from "~/components/ReviewsModal";
import { ReviewModal } from "~/components/activities";
import {
  usePublicHostProfile,
  useEventsByHost,
  useReviewsByEvent,
  useMyHost,
} from "~/hooks/useApi";

export const runtime = "edge";

export default function HostProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: _hostId } = use(params);
  const [user] = useAuthState(auth);
  const experiencesRef = useRef<HTMLDivElement>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showAllReviewsModal, setShowAllReviewsModal] = useState(false);

  const { data: host, isLoading: hostLoading } = usePublicHostProfile(_hostId);
  const { data: events } = useEventsByHost(_hostId);
  const { data: currentUserHost } = useMyHost(user?.uid ?? null);

  // Pick the first event's reviews as representative reviews for the host
  const firstEventId = events?.[0]?.id ?? null;
  const { data: reviewsEnvelope } = useReviewsByEvent(firstEventId);
  const reviews = reviewsEnvelope ?? [];

  // DEBUG: Console logs

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

  // Handler functions
  const handleViewExperiences = () => {
    experiencesRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleReadAllReviews = () => {
    setShowAllReviewsModal(true);
  };

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

      <div className="site-x mx-auto w-full max-w-[1120px] py-8">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Hosts", href: "/hosts" },
            { label: fullName },
          ]}
          className="mb-6"
        />

        {/* Profile Header */}
        <ProfileHeader
          host={host}
          onViewExperiences={handleViewExperiences}
          // onWriteReview={handleWriteReview}
        />

        {/* Gallery */}
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
              expertise_tags={host.expertise_tags ?? []}
              moods={moods}
            />
          </div>
          <div className="lg:col-span-2">
            <RatingsSection
              avg_rating={host.avg_rating ?? 0}
              total_reviews={host.total_reviews}
              reviews={reviews}
              hostId={currentUserHost?.id}
              eventHostId={_hostId}
              onReadAllReviews={handleReadAllReviews}
            />
          </div>
        </div>

        {/* Live & Upcoming Experiences */}
        {events && events.length > 0 && (
          <div ref={experiencesRef} className="mt-10 mb-12">
            <ExperiencesList events={events} />
          </div>
        )}
      </div>

      {/* Review Modal */}
      {events && events.length > 0 && user?.uid && (
        <ReviewModal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          eventId={events[0]!.id}
          hostId={events[0]!.host_id}
          eventTitle={events[0]!.title}
          userId={user.uid}
        />
      )}

      {/* Reviews Modal */}
      <ReviewsModal
        isOpen={showAllReviewsModal}
        onClose={() => setShowAllReviewsModal(false)}
        reviews={reviews}
        avg_rating={host.avg_rating ?? 0}
        hostId={currentUserHost?.id}
        eventHostId={_hostId}
      />
    </main>
  );
}
