"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "~/utils/firebase";
import {
  FiArrowLeft,
  FiCalendar,
  FiMail,
  FiMapPin,
  FiMoreVertical,
  FiPhone,
} from "react-icons/fi";
import { LuBadgeCheck } from "react-icons/lu";
import * as components from "~/components";
import { BecomeHostModal } from "~/components/become-host";
import {
  useApplicationStatus,
  useBookingsByUser,
  useEventsByHost,
  useListPublicEvents,
  useMyHost,
  useUserProfile,
} from "~/hooks/useApi";
import { useListTimeAction } from "~/hooks/useListTimeAction";
import { useStoredAuth } from "~/hooks/useStoredAuth";
import { formatIST } from "~/lib/datetime";

// Sizes follow the Figma "Explorer profile · Desktop 1440" frame.
const CARD = "rounded-2xl border border-white/[0.06] bg-[#131328]";
const FALLBACK_COVER = "/assets/home/hiking.webp";

// The panel in Navbar holds wallet, host dashboard, admin, support and logout.
const openMenu = () => window.dispatchEvent(new Event("msm:open-profile"));

export default function ProfilePage() {
  const router = useRouter();
  const { userId: storedUserId } = useStoredAuth();
  const userId =
    storedUserId && storedUserId !== "existing" ? storedUserId : null;
  // Stored auth is read on the client only; wait a tick before showing the
  // logged-out state so the server-rendered HTML matches.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  // The navbar treats a Firebase session as logged in even before the app user
  // id is stored, so this page must too.
  const [firebaseUser, firebaseLoading] = useAuthState(auth);
  const loggedIn = Boolean(userId) || Boolean(firebaseUser);
  const { closeBecomeHostModal, handleListTimeClick, showBecomeHostModal } =
    useListTimeAction();

  const { data: user } = useUserProfile(userId);
  const { data: application } = useApplicationStatus(userId);
  const hostStatus = application?.status?.application_status ?? null;
  const isHost = hostStatus === "approved";
  const { data: host } = useMyHost(isHost ? userId : null);
  const { data: hostEvents } = useEventsByHost(host?.id ?? null);
  const { data: bookings } = useBookingsByUser(userId);
  const { data: allEvents } = useListPublicEvents();

  const now = Date.now();
  const attended = (bookings ?? [])
    .filter(
      (b) =>
        b.status === "confirmed" && new Date(b.occurrence_date).getTime() < now,
    )
    .map((b) => ({
      booking: b,
      event: allEvents?.find((e) => e.id === b.event_id),
    }))
    .filter((x) => x.event)
    .sort(
      (a, b) =>
        new Date(b.booking.occurrence_date).getTime() -
        new Date(a.booking.occurrence_date).getTime(),
    );
  const hostsMet = new Set(attended.map((x) => x.event!.host_id)).size;
  const created = hostEvents?.length ?? 0;

  const displayName = user?.name ?? firebaseUser?.displayName ?? null;
  const email = user?.email ?? firebaseUser?.email ?? null;
  const avatarUrl = user?.avatar_url ?? firebaseUser?.photoURL ?? null;
  const handle = email ? `@${email.split("@")[0]}` : null;
  const role = isHost
    ? "Host"
    : hostStatus === "pending" || hostStatus === "under_review"
      ? "Host · In review"
      : "Explorer";

  return (
    <main className="flex min-h-screen flex-col items-center overflow-x-clip bg-[#080914] text-white max-md:pb-28 md:pl-20 min-[80rem]:pl-[230px]">
      <components.Navbar dark />

      <div className="mx-auto w-full max-w-[1210px] px-6 pt-6 pb-16 font-[family-name:var(--font-inter)] md:px-10 md:pt-10">
        {hydrated && !firebaseLoading && !loggedIn ? (
          <div
            className={`mx-auto mt-10 flex max-w-md flex-col items-center px-6 py-14 text-center ${CARD}`}
          >
            <p className="font-outfit text-lg font-semibold">
              Log in to see your profile
            </p>
            <p className="mt-1.5 text-sm text-white/55">
              Your experiences, highlights and hosting all live here.
            </p>
            <button
              type="button"
              onClick={openMenu}
              className="mt-5 rounded-full bg-gradient-to-r from-[#7038F5] to-[#B724EA] px-6 py-2.5 text-sm font-semibold transition hover:brightness-110"
            >
              Log in
            </button>
          </div>
        ) : (
          <div className="grid gap-10 lg:grid-cols-[400px_minmax(0,1fr)] lg:gap-12">
            {/* Identity column */}
            <section className="flex flex-col">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  aria-label="Go back"
                  onClick={() =>
                    window.history.length > 1 ? router.back() : router.push("/")
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#131328] transition hover:bg-[#1B1C33]"
                >
                  <FiArrowLeft className="h-4 w-4" />
                </button>
                <span className="text-sm text-white/60">My profile</span>
                <button
                  type="button"
                  aria-label="Account menu"
                  onClick={openMenu}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#131328] transition hover:bg-[#1B1C33]"
                >
                  <FiMoreVertical className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 flex flex-col items-center text-center">
                <div className="h-24 w-24 overflow-hidden rounded-full border-2 border-[#9B30FF] bg-[#1B1C33]">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="font-outfit flex h-full w-full items-center justify-center text-3xl font-bold text-[#D8B4FE]">
                      {displayName?.[0]?.toUpperCase() ?? ""}
                    </span>
                  )}
                </div>
                <h1 className="font-outfit mt-3 flex items-center gap-2 text-[26px] leading-8 font-bold">
                  {displayName ?? (
                    <span className="inline-block h-7 w-40 animate-pulse rounded bg-white/10" />
                  )}
                  {user?.is_verified && (
                    <LuBadgeCheck
                      className="h-5 w-5 text-[#B57BFF]"
                      aria-label="Verified"
                    />
                  )}
                </h1>
                {handle && (
                  <p className="mt-1 text-sm text-white/55">{handle}</p>
                )}
                <span className="mt-2.5 rounded-full border border-[#9B30FF]/40 bg-[#9B30FF]/15 px-3 py-1 text-xs font-medium text-[#E3CCFF]">
                  {role}
                </span>
                {(user?.city ?? host?.city) && (
                  <p className="mt-2 flex items-center gap-1 text-[13px] text-white/55">
                    <FiMapPin className="h-3.5 w-3.5" />
                    {user?.city ?? host?.city}
                  </p>
                )}
              </div>

              <div className="mt-6 grid grid-cols-3 divide-x divide-white/10 text-center">
                {[
                  [attended.length, "Experiences Attended"],
                  [created, "Experiences Created"],
                  [hostsMet, "Hosts Met"],
                ].map(([value, label]) => (
                  <div key={label} className="px-2">
                    <p className="font-outfit text-2xl font-bold">{value}</p>
                    <p className="mt-0.5 text-[11px] leading-4 text-white/55">
                      {label}
                    </p>
                  </div>
                ))}
              </div>

              {host?.bio ? (
                <div className={`mt-7 p-5 ${CARD}`}>
                  <h2 className="font-outfit text-lg font-semibold">
                    About Me
                  </h2>
                  <p className="mt-2 line-clamp-4 text-sm leading-6 text-white/70">
                    {host.bio}
                  </p>
                  {host.expertise_tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {host.expertise_tags.slice(0, 5).map((t) => (
                        <span
                          key={t}
                          className="rounded-full border border-white/10 bg-[#1B1C33] px-3 py-1 text-xs text-white/75"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  <Link
                    href={`/host/${host.slug}`}
                    className="mt-4 inline-block text-sm font-semibold text-[#D8B4FE] hover:text-white"
                  >
                    View public profile
                  </Link>
                </div>
              ) : (
                <div className={`mt-7 flex flex-col gap-3 p-5 text-sm ${CARD}`}>
                  <h2 className="font-outfit text-lg font-semibold">Account</h2>
                  {email && (
                    <p className="flex items-center gap-2.5 text-white/70">
                      <FiMail className="h-4 w-4 shrink-0 text-white/45" />
                      <span className="truncate">{email}</span>
                    </p>
                  )}
                  {(user?.phn_number ?? firebaseUser?.phoneNumber) && (
                    <p className="flex items-center gap-2.5 text-white/70">
                      <FiPhone className="h-4 w-4 shrink-0 text-white/45" />
                      {user?.phn_number ?? firebaseUser?.phoneNumber}
                    </p>
                  )}
                  {user?.created_at && (
                    <p className="flex items-center gap-2.5 text-white/70">
                      <FiCalendar className="h-4 w-4 shrink-0 text-white/45" />
                      Member since {formatIST(user.created_at, "MMMM yyyy")}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={openMenu}
                    className="mt-1 w-fit text-sm font-semibold text-[#D8B4FE] hover:text-white"
                  >
                    Wallet, settings &amp; support
                  </button>
                </div>
              )}
            </section>

            {/* Activity column */}
            <section className="flex min-w-0 flex-col gap-8">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-outfit text-lg font-semibold">
                    Personal Highlights
                  </h2>
                  <Link
                    href="/activities"
                    className="text-sm font-medium text-[#D8B4FE] hover:text-white"
                  >
                    View all
                  </Link>
                </div>
                {attended.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {attended.slice(0, 3).map(({ booking, event }) => (
                      <Link
                        key={booking.id}
                        href={`/experience/${event!.slug}`}
                        className={`group overflow-hidden ${CARD}`}
                      >
                        <div className="h-[118px] overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={event!.cover_image_url ?? FALLBACK_COVER}
                            alt={event!.title}
                            loading="lazy"
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        </div>
                        <div className="p-3">
                          <p className="truncate text-[13px] font-semibold">
                            {event!.title}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] text-white/50">
                            {formatIST(booking.occurrence_date, "MMM d, yyyy")}
                            {!event!.is_online && event!.location
                              ? ` · ${event!.location.split(",")[0]}`
                              : ""}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className={`p-5 text-sm text-white/55 ${CARD}`}>
                    Experiences you attend will show up here.{" "}
                    <Link
                      href="/explore"
                      className="font-semibold text-[#D8B4FE] hover:text-white"
                    >
                      Find one
                    </Link>
                  </div>
                )}
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-outfit text-lg font-semibold">
                    Active Experiences
                  </h2>
                  {isHost && (
                    <Link
                      href="/host-dashboard"
                      className="text-sm font-medium text-[#D8B4FE] hover:text-white"
                    >
                      Host dashboard
                    </Link>
                  )}
                </div>
                {isHost && hostEvents && hostEvents.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {hostEvents.slice(0, 5).map((e) => (
                      <Link
                        key={e.id}
                        href={`/experience/${e.slug}`}
                        className={`flex items-center gap-3 p-3 ${CARD}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={e.cover_image_url ?? FALLBACK_COVER}
                          alt=""
                          className="h-14 w-14 shrink-0 rounded-xl object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {e.title}
                          </p>
                          <p className="mt-0.5 text-xs text-white/55">
                            {formatIST(
                              e.next_available_date ?? e.time,
                              "EEE, MMM d · h:mm a",
                            )}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-md bg-white/5 px-2 py-1 text-[10px] font-bold tracking-wider text-white/60 uppercase">
                          {e.status}
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div
                    className={`flex flex-col items-center px-6 py-8 text-center ${CARD}`}
                  >
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#9B30FF]/15">
                      <FiCalendar className="h-6 w-6 text-[#D8B4FE]" />
                    </span>
                    <p className="font-outfit mt-4 text-base font-semibold">
                      No published experiences yet
                    </p>
                    <p className="mt-1.5 max-w-md text-[13px] text-white/55">
                      {hostStatus === "pending" || hostStatus === "under_review"
                        ? "Your host application is being reviewed. We'll let you know as soon as you can publish."
                        : isHost
                          ? "Create your first experience from the host dashboard."
                          : "Host your own experiences and earn from your time. Start with a quick host application."}
                    </p>
                    {!(
                      hostStatus === "pending" || hostStatus === "under_review"
                    ) && (
                      <button
                        type="button"
                        onClick={handleListTimeClick}
                        className="mt-5 h-11 w-full rounded-full border border-white/10 bg-[#1B1C33] text-sm font-semibold text-[#D8B4FE] transition hover:bg-[#232445]"
                      >
                        {isHost
                          ? "Create an experience"
                          : "Explore creator pathway"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>

      <components.Home.Footer dark />
      <BecomeHostModal
        open={showBecomeHostModal}
        onClose={closeBecomeHostModal}
      />
    </main>
  );
}
