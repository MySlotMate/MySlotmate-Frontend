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
import { dummyHostPublicProfile } from "~/data/hostProfile";

export const runtime = "edge";

/**
 * Public host profile page.
 *
 * ⚠️  Backend is missing a public endpoint:
 *     GET /hosts/{hostID}   →  Returns host profile by host ID
 *
 * Once that endpoint exists, replace the dummy data below with:
 *   const { data: host } = useHostById(hostId);
 *   const { data: events } = useEventsByHost(hostId);
 *   const { data: reviews } = useReviewsByEvent(firstEventId);
 */
export default function HostProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: hostId } = use(params);

  // TODO: Replace with API call once GET /hosts/{hostID} endpoint is added
  const profile = dummyHostPublicProfile;
  const { host } = profile;
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
        <div className="mt-6">
          <PhotoGallery images={profile.gallery_urls} />
        </div>

        {/* Stats */}
        <div className="mt-6">
          <StatsBar
            total_events_hosted={profile.total_events_hosted}
            total_people_met={profile.total_people_met}
            avg_rating={host.avg_rating}
          />
        </div>

        {/* About + Ratings side by side */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <AboutSection
              first_name={host.first_name}
              bio={host.bio}
              expertise_tags={host.expertise_tags}
              moods={host.moods}
            />
          </div>
          <div className="lg:col-span-2">
            <RatingsSection
              avg_rating={host.avg_rating}
              total_reviews={host.total_reviews}
              reviews={profile.reviews}
            />
          </div>
        </div>

        {/* Live & Upcoming Experiences */}
        <div className="mt-10 mb-12">
          <ExperiencesList events={profile.upcoming_events} />
        </div>
      </div>
    </main>
  );
}
