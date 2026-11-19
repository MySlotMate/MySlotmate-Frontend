"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import type { EventDTO, PublicHostProfileDTO } from "~/lib/api";
import GoogleLogin from "~/components/GoogleLogin";
import SlotCard from "./SlotCard";

const TOP = 4;

/**
 * Rank events for the homepage highlight: best rated first, then the most
 * booked, then whatever is happening soonest.
 */
function topEvents(events: EventDTO[]): EventDTO[] {
  const when = (e: EventDTO) =>
    new Date(e.next_available_date ?? e.time).getTime() || Infinity;
  return [...events]
    .sort(
      (a, b) =>
        (b.avg_rating ?? 0) - (a.avg_rating ?? 0) ||
        (b.total_bookings ?? 0) - (a.total_bookings ?? 0) ||
        when(a) - when(b),
    )
    .slice(0, TOP);
}

/** Homepage "Top events": a short showcase, the full list sits behind sign-in. */
export default function DiscoverGrid({
  events,
  hostById,
}: {
  events: EventDTO[];
  hostById: Map<string, PublicHostProfileDTO>;
}) {
  const router = useRouter();
  const [showLogin, setShowLogin] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    setSignedIn(Boolean(localStorage.getItem("msm_user_id")));
  }, []);

  const top = useMemo(() => topEvents(events), [events]);

  const seeMore = () => {
    if (signedIn) router.push("/explore");
    else setShowLogin(true);
  };

  if (top.length === 0) return null;

  return (
    <section id="discover" className="w-full scroll-mt-4">
      <div className="mx-auto max-w-[1280px] px-5 pt-16 pb-16 md:px-10 md:pt-24 md:pb-24">
        <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="mb-3 text-sm font-semibold tracking-[0.14em] text-[#D8B4FE] uppercase">
              Top events
            </p>
            <h2 className="font-outfit max-w-[560px] text-[clamp(30px,4vw,48px)] leading-[1.08] font-medium tracking-[-0.02em] text-white">
              The ones people can&apos;t stop{" "}
              <span className="bg-gradient-to-r from-[#D8B4FE] to-[#A020F0] bg-clip-text text-transparent">
                booking.
              </span>
            </h2>
          </div>
          <button
            type="button"
            onClick={seeMore}
            className="group flex h-12 w-fit shrink-0 items-center gap-2 rounded-full border border-white/15 px-6 text-[15px] font-semibold text-white transition hover:border-white/30 hover:bg-white/[0.06]"
          >
            See all events
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
          {top.map((e, i) => (
            <SlotCard
              key={e.id}
              event={e}
              host={hostById.get(e.host_id)}
              index={i}
            />
          ))}
        </div>
      </div>

      <GoogleLogin
        open={showLogin}
        onClose={() => {
          setShowLogin(false);
          if (localStorage.getItem("msm_user_id")) router.push("/explore");
        }}
        title="See every event near you"
        subtitle="Sign in to browse all events, save the ones you like and book in a tap."
      />
    </section>
  );
}
