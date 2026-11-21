"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  AlertTriangle,
  ArrowRight,
  CalendarX2,
  CheckCircle2,
  Clock,
  Inbox,
  Landmark,
  MapPin,
  MessageCircle,
  Plus,
  ScanLine,
  Star,
  Video,
  type LucideIcon,
} from "lucide-react";
import { auth } from "~/utils/firebase";
import { formatIST } from "~/lib/datetime";
import { useStoredAuth } from "~/hooks/useStoredAuth";
import { useIdToken } from "~/hooks/useIdToken";
import { useHostTier } from "~/hooks/useHostTier";
import { VerifyToEarnCard } from "~/components/host-dashboard/VerifyToEarn";
import { FREE_HOST_LIMITS } from "~/lib/hostTier";
import {
  useCalendarEvents,
  useEventsByHost,
  useHostAttentionItems,
  useHostDashboard,
  useHostPendingJoinRequestCount,
  useHostSales,
  useMyHost,
  usePayoutMethods,
  useTodaySchedule,
} from "~/hooks/useApi";
import type { AttentionItemDTO, EventDTO } from "~/lib/api";
import EventCover from "~/components/EventCover";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const inr = (cents: number) =>
  `₹${(cents / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const CARD = "rounded-2xl border border-white/10 bg-[#121426]";
const SECTION_H = "text-sm font-semibold text-white";
const LINK = "text-xs font-semibold text-[#D8B4FE] transition hover:text-white";

/** One thing the host can act on, shown in "Needs you". */
type Todo = {
  key: string;
  icon: LucideIcon;
  tone: string;
  text: string;
  cta: string;
  href: string;
};

/** Only alerts a host can act on. Guest reviews are up to guests. */
function todoFromAttention(it: AttentionItemDTO): Todo | null {
  switch (it.type) {
    case "unread_message":
      return {
        key: "messages",
        icon: MessageCircle,
        tone: "bg-[#A020F0]/20 text-[#D8B4FE]",
        text: it.message,
        cta: "Reply",
        href: "/host-dashboard/messages",
      };
    case "cancelled_booking":
      return {
        key: "cancelled",
        icon: CalendarX2,
        tone: "bg-rose-500/15 text-rose-300",
        text: it.message,
        cta: "See bookings",
        href: "/host-dashboard/bookings",
      };
    case "low_rating":
      return {
        key: "rating",
        icon: AlertTriangle,
        tone: "bg-amber-500/15 text-amber-300",
        text: it.message,
        cta: "See reviews",
        href: "/host-dashboard/profile",
      };
    default:
      return null;
  }
}

/** The first session that hasn't finished yet. */
function nextSessionOf(events: EventDTO[]) {
  const now = Date.now();
  return events
    .filter((e) => e.status !== "draft")
    .filter((e) => {
      const end = e.end_time
        ? new Date(e.end_time).getTime()
        : new Date(e.time).getTime() + 2 * 3600 * 1000;
      return end > now;
    })
    .sort((a, b) => +new Date(a.time) - +new Date(b.time));
}

/* ------------------------------------------------------------------ */
/*  Pieces                                                             */
/* ------------------------------------------------------------------ */

function NextUp({ ev }: { ev: EventDTO }) {
  const start = new Date(ev.time);
  const end = ev.end_time ? new Date(ev.end_time) : null;
  const booked = ev.total_bookings ?? 0;
  const cap = ev.capacity ?? 0;
  const pct = cap > 0 ? Math.min(100, (booked / cap) * 100) : 0;
  const diff = start.getTime() - Date.now();
  const live = diff <= 0;
  const soon = diff > 0 && diff < 60 * 60 * 1000;
  const isToday =
    formatIST(start, "yyyy-MM-dd") === formatIST(new Date(), "yyyy-MM-dd");

  return (
    <div className="flex gap-4">
      <Link
        href={`/host-dashboard/experiences/${ev.id}`}
        className="shrink-0"
        aria-label={`Open ${ev.title}`}
      >
        <EventCover
          src={ev.cover_image_url}
          seed={ev.id}
          mood={ev.mood}
          iconSize="sm"
          blurFill
          className="aspect-[4/5] w-24 rounded-xl sm:w-28"
        />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="flex items-center gap-2 text-xs font-medium text-[#D8B4FE]">
          {(live || soon) && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                live
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-amber-500/15 text-amber-300"
              }`}
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
              {live ? "Happening now" : "Starting soon"}
            </span>
          )}
          {isToday ? "Today" : formatIST(start, "EEE, d MMM")}
        </p>
        <Link
          href={`/host-dashboard/experiences/${ev.id}`}
          className="mt-1 line-clamp-2 text-[17px] leading-snug font-semibold text-white hover:text-[#E9D8FD]"
        >
          {ev.title}
        </Link>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-white/55">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {formatIST(start, "h:mm a")}
            {end && ` – ${formatIST(end, "h:mm a")}`}
          </span>
          {ev.is_online ? (
            <span className="flex items-center gap-1">
              <Video className="h-3.5 w-3.5" aria-hidden />
              Online
            </span>
          ) : (
            ev.location && (
              <span className="flex min-w-0 items-center gap-1">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="truncate">{ev.location}</span>
              </span>
            )
          )}
        </p>

        {cap > 0 && (
          <div className="mt-3 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="h-full rounded-full bg-[#A020F0]"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="shrink-0 text-xs text-white/60">
              {booked}/{cap} booked
            </span>
          </div>
        )}

        <div className="mt-auto flex flex-wrap gap-2 pt-3">
          <Link
            href={`/host-dashboard/scan?event=${ev.id}&date=${encodeURIComponent(ev.time)}`}
            className="flex h-9 items-center gap-1.5 rounded-full bg-[#A020F0] px-4 text-[13px] font-semibold text-white transition hover:bg-[#8A1AD0]"
          >
            <ScanLine className="h-4 w-4" aria-hidden /> Check in
          </Link>
          <Link
            href={`/host-dashboard/messages?event=${ev.id}`}
            className="flex h-9 items-center gap-1.5 rounded-full border border-white/15 px-4 text-[13px] font-medium text-white transition hover:bg-white/[0.06]"
          >
            <MessageCircle className="h-4 w-4" aria-hidden /> Message guests
          </Link>
        </div>
      </div>
    </div>
  );
}

function Skeleton() {
  const block = "animate-pulse rounded-2xl bg-white/[0.05]";
  return (
    <div className="space-y-4">
      <div className={`${block} h-20`} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className={`${block} h-60`} />
        <div className={`${block} h-60`} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

/**
 * Host home. Answers one question: what do I need to do today?
 * Needs you → Next up → three numbers → latest bookings. Everything else
 * lives on its own page in the sidebar.
 */
export default function HostTodayPage() {
  const [user] = useAuthState(auth);
  const { userId, hostId } = useStoredAuth();
  const idToken = useIdToken();

  const {
    data: dashboard,
    isLoading,
    error: queryError,
    refetch,
  } = useHostDashboard(hostId, userId);
  const { data: calendarEvents } = useCalendarEvents(hostId);
  const { data: todayData } = useTodaySchedule(hostId);
  const { data: sales } = useHostSales(idToken, { limit: 250, offset: 0 });
  const { data: attentionData } = useHostAttentionItems(hostId);
  const { data: events } = useEventsByHost(hostId);
  const { data: pendingRequests = 0 } = useHostPendingJoinRequestCount(idToken);
  const { data: payoutMethods, isSuccess: methodsLoaded } = usePayoutMethods(
    hostId,
    idToken,
  );
  const {
    isVerified: verifiedHost,
    isLoading: tierLoading,
    applicationStatus,
  } = useHostTier();
  // Treat as verified while loading so verified hosts never see the free UI flash.
  const isVerified = tierLoading || verifiedHost;
  const { data: myHost } = useMyHost(
    userId && userId !== "existing" ? userId : null,
  );

  // Greeting and date depend on the clock, so they're set after mount.
  const [mounted, setMounted] = useState(false);
  const [greeting, setGreeting] = useState("Hello");
  const [today, setToday] = useState("");
  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(
      h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening",
    );
    setToday(formatIST(new Date(), "EEEE, d MMMM"));
    setMounted(true);
  }, []);
  const firstName =
    myHost?.first_name ?? user?.displayName?.split(" ")[0] ?? "there";

  /* ---- derived data ---- */
  const liveSales = useMemo(
    () =>
      (sales ?? []).filter(
        (s) => s.Status !== "cancelled" && s.Status !== "refunded",
      ),
    [sales],
  );

  const earnedThisMonth = useMemo(() => {
    const month = formatIST(new Date(), "yyyy-MM");
    return liveSales
      .filter((s) => formatIST(s.CreatedAt, "yyyy-MM") === month)
      .reduce((sum, s) => sum + (s.NetEarningCents ?? s.AmountCents ?? 0), 0);
  }, [liveSales]);

  const sessions = useMemo(() => {
    const merged = new Map<string, EventDTO>();
    for (const e of [...(todayData ?? []), ...(calendarEvents ?? [])])
      merged.set(`${e.id}-${e.time}`, e);
    return nextSessionOf([...merged.values()]);
  }, [todayData, calendarEvents]);
  const nextUp = sessions[0];
  const later = sessions.slice(1, 4);
  const weekAhead = sessions.filter(
    (e) => +new Date(e.time) - Date.now() < 7 * 24 * 3600 * 1000,
  ).length;

  const todos = useMemo<Todo[]>(() => {
    const list: Todo[] = [];
    if (pendingRequests > 0)
      list.push({
        key: "requests",
        icon: Inbox,
        tone: "bg-[#A020F0]/20 text-[#D8B4FE]",
        text: `${pendingRequests} ${pendingRequests === 1 ? "guest is" : "guests are"} waiting for you to approve their request.`,
        cta: "Review",
        href: "/host-dashboard/requests",
      });
    for (const it of attentionData ?? []) {
      const t = todoFromAttention(it);
      if (t) list.push(t);
    }
    if (isVerified && methodsLoaded && (payoutMethods?.length ?? 0) === 0)
      list.push({
        key: "bank",
        icon: Landmark,
        tone: "bg-amber-500/15 text-amber-300",
        text: "Add your bank account so we can pay you.",
        cta: "Add",
        href: "/host-dashboard/earnings",
      });
    return list;
  }, [
    pendingRequests,
    attentionData,
    isVerified,
    methodsLoaded,
    payoutMethods,
  ]);

  const rating = dashboard?.avg_rating ?? 0;
  const activeEvents = (events ?? []).filter(
    (e) => e.status === "live" || e.status === "paused",
  ).length;

  // No host profile just means nothing hosted yet: the page shows its empty
  // states and the "Get verified" card, not an error.
  const error =
    mounted && hostId && queryError ? "We couldn't load your dashboard." : "";

  const numbers: { label: string; value: string; href: string }[] = [
    isVerified
      ? {
          label: "Earned this month",
          value: inr(earnedThisMonth),
          href: "/host-dashboard/earnings",
        }
      : {
          label: "Active events",
          value: `${activeEvents} of ${FREE_HOST_LIMITS.maxActiveEvents}`,
          href: "/host-dashboard/experiences",
        },
    {
      label: "Sessions next 7 days",
      value: String(weekAhead),
      href: "/host-dashboard/calendar",
    },
    {
      label: "Rating",
      value: rating > 0 ? `${rating.toFixed(1)} ★` : "New",
      href: "/host-dashboard/profile",
    },
  ];

  return (
    <main className="mx-auto w-full max-w-[1080px] px-4 py-6 sm:px-6 md:py-10">
      {/* Greeting + one action */}
      <div className="mb-6 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-white/50">{today}</p>
          <h1 className="font-outfit mt-1 text-[24px] leading-tight font-semibold tracking-[-0.01em] text-balance text-white sm:text-[32px]">
            {greeting}, {firstName}
          </h1>
        </div>
        <Link
          href="/host-dashboard/experiences/new"
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-[#A020F0] px-4 text-sm font-semibold text-white transition hover:bg-[#8A1AD0]"
        >
          <Plus className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Create event</span>
          <span className="sm:hidden">New</span>
        </Link>
      </div>

      {error && (
        <div className="mb-4 flex items-center justify-between gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </span>
          <button
            type="button"
            onClick={() => void refetch()}
            className="shrink-0 font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {!mounted || isLoading ? (
        <Skeleton />
      ) : (
        <div className="space-y-4">
          {!isVerified && (
            <VerifyToEarnCard
              applicationStatus={applicationStatus}
              isPhoneVerified={myHost?.is_phone_verified}
              isIdentityVerified={myHost?.is_identity_verified}
            />
          )}

          {/* Needs you */}
          {todos.length > 0 ? (
            <section className={`${CARD} p-2`} aria-label="Needs you">
              <p className="px-3 pt-2 pb-1 text-xs font-medium text-white/50">
                Needs you
              </p>
              <ul>
                {todos.map((t) => (
                  <li key={t.key}>
                    <Link
                      href={t.href}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-white/[0.04]"
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${t.tone}`}
                      >
                        <t.icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1 text-sm text-white/85">
                        {t.text}
                      </span>
                      <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-[#D8B4FE]">
                        {t.cta} <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <p className="flex items-center gap-2 px-1 text-sm text-white/50">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              You&apos;re all caught up.
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            {/* Next up */}
            <section className={`${CARD} p-4 sm:p-5`}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className={SECTION_H}>Next up</h2>
                <Link href="/host-dashboard/calendar" className={LINK}>
                  Calendar
                </Link>
              </div>
              {nextUp ? (
                <>
                  <NextUp ev={nextUp} />
                  {later.length > 0 && (
                    <ul className="mt-5 space-y-1 border-t border-white/[0.06] pt-3">
                      {later.map((e) => (
                        <li key={`${e.id}-${e.time}`}>
                          <Link
                            href={`/host-dashboard/experiences/${e.id}`}
                            className="flex items-center gap-3 rounded-lg px-1 py-1.5 text-sm transition hover:bg-white/[0.03]"
                          >
                            <span className="w-20 shrink-0 text-xs text-white/50">
                              {formatIST(e.time, "EEE d MMM")}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-white/85">
                              {e.title}
                            </span>
                            <span className="shrink-0 text-xs text-white/40">
                              {formatIST(e.time, "h:mm a")}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-white/10 px-6 py-10 text-center">
                  <p className="text-sm text-white/60">
                    Nothing scheduled yet.
                  </p>
                  <Link
                    href="/host-dashboard/experiences/new"
                    className="rounded-full bg-[#A020F0] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#8A1AD0]"
                  >
                    Create an event
                  </Link>
                </div>
              )}
            </section>

            <div className="space-y-4">
              {/* Three numbers */}
              <section
                aria-label="Your numbers"
                className={`${CARD} grid grid-cols-3 divide-x divide-white/[0.06] py-4`}
              >
                {numbers.map((n) => (
                  <Link
                    key={n.label}
                    href={n.href}
                    className="min-w-0 px-3 text-center transition hover:opacity-80 sm:px-4"
                  >
                    <p className="font-outfit truncate text-xl font-semibold text-white">
                      {n.value}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-tight text-white/50">
                      {n.label}
                    </p>
                  </Link>
                ))}
              </section>

              {/* Latest bookings */}
              <section className={`${CARD} p-4 sm:p-5`}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className={SECTION_H}>Latest bookings</h2>
                  <Link href="/host-dashboard/bookings" className={LINK}>
                    See all
                  </Link>
                </div>
                {liveSales.length === 0 ? (
                  <p className="py-4 text-sm text-white/50">
                    New bookings will show up here.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {liveSales.slice(0, 4).map((s) => {
                      const name = s.BuyerName || "Guest";
                      return (
                        <li
                          key={s.BookingID}
                          className="flex items-center gap-3"
                        >
                          {s.BuyerAvatarURL ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={s.BuyerAvatarURL}
                              alt=""
                              referrerPolicy="no-referrer"
                              className="h-9 w-9 shrink-0 rounded-full object-cover"
                            />
                          ) : (
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#A020F0]/15 text-xs font-semibold text-[#D8B4FE]">
                              {name.charAt(0).toUpperCase()}
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-white">
                              {name}
                              {s.Quantity > 1 && (
                                <span className="font-normal text-white/50">
                                  {" "}
                                  ×{s.Quantity}
                                </span>
                              )}
                            </p>
                            <p className="truncate text-xs text-white/50">
                              {s.EventTitle} ·{" "}
                              {formatIST(s.OccurrenceDate, "d MMM")}
                            </p>
                          </div>
                          <span className="shrink-0 text-sm font-semibold text-white">
                            {inr(s.NetEarningCents ?? s.AmountCents ?? 0)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              {rating > 0 && (
                <p className="flex items-center gap-1.5 px-1 text-xs text-white/40">
                  <Star className="h-3.5 w-3.5" aria-hidden />
                  {dashboard?.total_reviews ?? 0} reviews from your guests
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
