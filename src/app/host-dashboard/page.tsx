"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuthState } from "react-firebase-hooks/auth";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CalendarX2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileSpreadsheet,
  KeyRound,
  Lightbulb,
  MapPin,
  MessageCircle,
  Plus,
  ScanLine,
  Star,
  Ticket,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { auth } from "~/utils/firebase";
import { EarningsChart } from "~/components/host-dashboard";
import type { ChartPoint } from "~/components/host-dashboard";
import EventActionsMenu from "~/components/host-dashboard/EventActionsMenu";
import ManageCodesModal from "~/components/host-dashboard/ManageCodesModal";
import HostOnSpotPickerModal from "~/components/host-dashboard/HostOnSpotPickerModal";
import HostCodesPickerModal from "~/components/host-dashboard/HostCodesPickerModal";
import { formatIST } from "~/lib/datetime";
import { useStoredAuth } from "~/hooks/useStoredAuth";
import { useHostTier } from "~/hooks/useHostTier";
import { VerifyToEarnCard } from "~/components/host-dashboard/VerifyToEarn";
import { FREE_HOST_LIMITS } from "~/lib/hostTier";
import {
  useCalendarEvents,
  useEventsByHost,
  useHostAttentionItems,
  useHostDashboard,
  useHostSales,
  useMyHost,
  usePayoutHistory,
  useTodaySchedule,
} from "~/hooks/useApi";
import type { AttentionItemDTO, EventDTO } from "~/lib/api";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const inr = (cents: number) =>
  `₹${(cents / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const CARD = "rounded-3xl border border-white/[0.08] bg-[#121426]";
const SECTION_H = "font-outfit text-lg font-semibold text-white";
const LINK = "text-sm font-semibold text-[#D8B4FE] transition hover:text-white";

type Attention = {
  icon: LucideIcon;
  tone: string;
  title: string;
  description: string;
  cta: string;
  href: string;
};

function mapAttention(it: AttentionItemDTO): Attention {
  const many = (it.count ?? 0) > 1;
  switch (it.type) {
    case "cancelled_booking":
      return {
        icon: CalendarX2,
        tone: "bg-rose-500/15 text-rose-300",
        title: many ? "Cancelled bookings" : "Cancelled booking",
        description: it.message,
        cta: "View bookings",
        href: "/host-dashboard/bookings",
      };
    case "pending_review":
      return {
        icon: Star,
        tone: "bg-amber-500/15 text-amber-300",
        title: "Awaiting guest reviews",
        description: it.message,
        cta: "View requests",
        href: "/host-dashboard/requests",
      };
    case "unread_message":
      return {
        icon: MessageCircle,
        tone: "bg-[#A020F0]/20 text-[#D8B4FE]",
        title: many ? "Unread messages" : "Unread message",
        description: it.message,
        cta: "Reply",
        href: "/host-dashboard/messages",
      };
    case "low_rating":
      return {
        icon: AlertTriangle,
        tone: "bg-rose-500/15 text-rose-300",
        title: "Low average rating",
        description: it.message,
        cta: "View profile",
        href: "/host-dashboard/profile",
      };
    default:
      return {
        icon: AlertTriangle,
        tone: "bg-[#A020F0]/20 text-[#D8B4FE]",
        title: "Needs attention",
        description: it.message,
        cta: "Open",
        href: "/host-dashboard",
      };
  }
}

const TIPS = [
  {
    title: "Add a video preview",
    desc: "Events with a short video on their page convert up to 20% better.",
  },
  {
    title: "Pick your time slots well",
    desc: "Weekend mornings and evenings draw up to 35% more guests.",
  },
  {
    title: "Reply within the hour",
    desc: "Fast replies make guests up to 3× more likely to book.",
  },
];

/* ------------------------------------------------------------------ */
/*  Pieces                                                             */
/* ------------------------------------------------------------------ */

function Stat({
  label,
  value,
  foot,
  icon: Icon,
  href,
  trend,
}: {
  label: string;
  value: string;
  foot: string;
  icon: LucideIcon;
  href: string;
  trend?: number | null;
}) {
  return (
    <Link
      href={href}
      className={`${CARD} group flex flex-col p-4 transition hover:border-[#A020F0]/40 sm:p-5`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-white/55">{label}</span>
        <Icon className="h-4 w-4 shrink-0 text-white/35 transition group-hover:text-[#D8B4FE]" />
      </div>
      <p className="font-outfit mt-3 text-[26px] leading-none font-semibold tracking-tight text-white sm:text-[30px]">
        {value}
      </p>
      <p className="mt-2 flex items-center gap-1 text-xs text-white/45">
        {trend != null && trend !== 0 && (
          <span
            className={`flex items-center gap-0.5 font-semibold ${trend > 0 ? "text-emerald-300" : "text-rose-300"}`}
          >
            {trend > 0 ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            {Math.abs(trend)}%
          </span>
        )}
        <span className="truncate">{foot}</span>
      </p>
    </Link>
  );
}

function SessionRow({
  ev,
  hostId,
  showDate,
}: {
  ev: EventDTO;
  hostId: string | null;
  showDate?: boolean;
}) {
  const start = new Date(ev.time);
  const end = ev.end_time ? new Date(ev.end_time) : null;
  const booked = ev.total_bookings ?? 0;
  const cap = ev.capacity ?? 0;
  const pct = cap > 0 ? Math.min(100, (booked / cap) * 100) : 0;
  const diff = start.getTime() - Date.now();
  const soon = diff > 0 && diff < 60 * 60 * 1000;
  const live = diff <= 0 && (!end || end.getTime() > Date.now());

  return (
    <div className="flex items-stretch gap-3 py-4 first:pt-0 last:pb-0 sm:gap-4">
      {/* Time / date block */}
      <div className="flex w-14 shrink-0 flex-col items-center justify-center self-start rounded-2xl bg-white/[0.05] py-2.5 text-center sm:w-16">
        {showDate ? (
          <>
            <span className="text-[11px] font-semibold text-[#D8B4FE] uppercase">
              {formatIST(start, "EEE")}
            </span>
            <span className="font-outfit text-xl leading-tight font-semibold text-white">
              {formatIST(start, "d")}
            </span>
            <span className="text-[11px] text-white/45">
              {formatIST(start, "MMM")}
            </span>
          </>
        ) : (
          <>
            <span className="font-outfit text-base leading-tight font-semibold text-white">
              {formatIST(start, "h:mm")}
            </span>
            <span className="text-[11px] text-white/45 uppercase">
              {formatIST(start, "a")}
            </span>
          </>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            {(soon || live) && (
              <span
                className={`mb-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  live
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-amber-500/15 text-amber-300"
                }`}
              >
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                {live ? "Happening now" : "Starting soon"}
              </span>
            )}
            <Link
              href={`/host-dashboard/experiences/${ev.id}`}
              className="line-clamp-1 text-[15px] font-semibold text-white hover:text-[#E9D8FD]"
            >
              {ev.title}
            </Link>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-white/50">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatIST(start, "h:mm a")}
                {end && ` – ${formatIST(end, "h:mm a")}`}
              </span>
              {ev.location && (
                <span className="flex min-w-0 items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{ev.location}</span>
                </span>
              )}
            </p>
          </div>
          <EventActionsMenu
            event={{
              id: ev.id,
              slug: ev.slug,
              title: ev.title,
              is_recurring: ev.is_recurring ?? false,
              status: ev.status,
            }}
            hostId={hostId}
          />
        </div>

        <div className="mt-3 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#7B2FFF] to-[#A020F0]"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="shrink-0 text-xs font-medium text-white/60">
            {booked}/{cap} booked
          </span>
        </div>

        {!showDate && (
          <div className="mt-3 flex gap-2">
            <Link
              href="/host-dashboard/scan"
              className="flex h-9 items-center gap-1.5 rounded-full bg-white px-4 text-[13px] font-semibold text-[#080914] transition hover:bg-white/90"
            >
              <ScanLine className="h-4 w-4" /> Check in
            </Link>
            <Link
              href="/host-dashboard/bookings"
              className="flex h-9 items-center gap-1.5 rounded-full border border-white/15 px-4 text-[13px] font-semibold text-white transition hover:bg-white/[0.06]"
            >
              <Users className="h-4 w-4" /> Guests
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function Empty({
  icon: Icon,
  text,
  cta,
  href,
}: {
  icon: LucideIcon;
  text: string;
  cta: string;
  href: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 px-6 py-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.05]">
        <Icon className="h-6 w-6 text-[#D8B4FE]" />
      </span>
      <p className="text-sm text-white/55">{text}</p>
      <Link href={href} className={LINK}>
        {cta}
      </Link>
    </div>
  );
}

function Skeleton() {
  const block = "animate-pulse rounded-3xl bg-white/[0.05]";
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${block} h-28`} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`${block} h-24`} />
        ))}
      </div>
      <div className={`${block} h-72`} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function HostTodayPage() {
  const [user] = useAuthState(auth);
  const queryClient = useQueryClient();
  const { userId, hostId } = useStoredAuth();

  const [idToken, setIdToken] = useState<string | null>(null);
  useEffect(() => {
    if (user) void user.getIdToken().then(setIdToken);
    else setIdToken(localStorage.getItem("msm_auth_token"));
  }, [user]);

  const {
    data: dashboard,
    isLoading,
    error: queryError,
    refetch,
  } = useHostDashboard(hostId, userId);
  const { data: calendarEvents } = useCalendarEvents(hostId);
  const { data: todayData } = useTodaySchedule(hostId);
  const { data: payouts } = usePayoutHistory(hostId, idToken);
  const { data: sales } = useHostSales(idToken, { limit: 250, offset: 0 });
  const { data: attentionData } = useHostAttentionItems(hostId);
  const { data: events } = useEventsByHost(hostId);
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

  // Host id lives in localStorage, so the "no host" notice waits for mount
  // to keep the server and first client render identical.
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
  const firstName = user?.displayName?.split(" ")[0] ?? "Host";

  const [tip, setTip] = useState(0);
  const [allToday, setAllToday] = useState(false);
  const [onSpot, setOnSpot] = useState(false);
  const [bulk, setBulk] = useState(false);
  const [codesPicker, setCodesPicker] = useState(false);
  const [codesEvent, setCodesEvent] = useState<{
    id: string;
    title: string;
  } | null>(null);

  /* ---- derived data ---- */
  const liveSales = useMemo(
    () =>
      (sales ?? []).filter(
        (s) => s.Status !== "cancelled" && s.Status !== "refunded",
      ),
    [sales],
  );

  // Trailing six months (IST); anchors sit mid-month so IST never spills over.
  const chartPoints = useMemo<ChartPoint[]>(() => {
    const now = new Date();
    const buckets = Array.from({ length: 6 }, (_, idx) => {
      const anchor = new Date(
        now.getFullYear(),
        now.getMonth() - (5 - idx),
        15,
        12,
      );
      return {
        key: formatIST(anchor, "yyyy-MM"),
        label: formatIST(anchor, "MMM"),
        earnings: 0,
        bookings: 0,
      };
    });
    const at = new Map(buckets.map((b, i) => [b.key, i]));
    for (const s of liveSales) {
      const i = at.get(formatIST(s.CreatedAt, "yyyy-MM"));
      if (i === undefined) continue;
      buckets[i]!.earnings += s.NetEarningCents ?? s.AmountCents ?? 0;
      buckets[i]!.bookings += 1;
    }
    return buckets.map(({ label, earnings, bookings }) => ({
      label,
      earnings,
      bookings,
    }));
  }, [liveSales]);

  const thisMonth = chartPoints[5];
  const lastMonth = chartPoints[4];
  const pctChange = (a?: number, b?: number) =>
    a != null && b ? Math.round(((a - b) / b) * 100) : null;

  // Drafts are work in progress, so they never show on Today.
  const todaySessions = useMemo(() => {
    const todayKey = formatIST(new Date(), "yyyy-MM-dd");
    const src =
      todayData && todayData.length > 0
        ? todayData
        : (calendarEvents ?? []).filter(
            (e) => formatIST(e.time, "yyyy-MM-dd") === todayKey,
          );
    return src
      .filter((e) => e.status !== "draft")
      .sort((a, b) => +new Date(a.time) - +new Date(b.time));
  }, [todayData, calendarEvents]);

  const upcoming = useMemo(() => {
    const todayKey = formatIST(new Date(), "yyyy-MM-dd");
    return (calendarEvents ?? [])
      .filter(
        (e) =>
          e.status !== "draft" &&
          new Date(e.time) > new Date() &&
          formatIST(e.time, "yyyy-MM-dd") !== todayKey,
      )
      .sort((a, b) => +new Date(a.time) - +new Date(b.time));
  }, [calendarEvents]);
  const weekAhead = upcoming.filter(
    (e) => +new Date(e.time) - Date.now() < 7 * 24 * 3600 * 1000,
  ).length;

  const attention = useMemo<Attention[]>(() => {
    const list = (attentionData ?? []).map(mapAttention);
    const paid = payouts?.find((p) => p.status === "completed");
    if (paid)
      list.push({
        icon: Wallet,
        tone: "bg-emerald-500/15 text-emerald-300",
        title: "Payout sent",
        description: `${inr(paid.amount_cents)} is on its way to your bank.`,
        cta: "See payouts",
        href: "/host-dashboard/earnings",
      });
    return list;
  }, [attentionData, payouts]);

  const rating = dashboard?.avg_rating ?? 0;
  const myEvents = events ?? [];

  const refreshAfterBooking = () => {
    void queryClient.invalidateQueries({ queryKey: ["eventsByHost", hostId] });
    void queryClient.invalidateQueries({
      queryKey: ["todaySchedule", hostId],
    });
  };

  const ACTIONS: {
    label: string;
    icon: LucideIcon;
    href?: string;
    onClick?: () => void;
  }[] = [
    { label: "Scan tickets", icon: ScanLine, href: "/host-dashboard/scan" },
    {
      label: "Walk-in booking",
      icon: UserPlus,
      onClick: () => setOnSpot(true),
    },
    {
      label: "Import guests",
      icon: FileSpreadsheet,
      onClick: () => setBulk(true),
    },
    {
      label: "Codes & passkey",
      icon: KeyRound,
      onClick: () => setCodesPicker(true),
    },
    { label: "Bookings", icon: Ticket, href: "/host-dashboard/bookings" },
    {
      label: isVerified ? "Payouts" : "Start earning",
      icon: Wallet,
      href: "/host-dashboard/earnings",
    },
  ];

  // No host profile just means nothing hosted yet: the page shows its empty
  // states and the "Get verified" card, not an error.
  const error =
    mounted && hostId && queryError ? "We couldn't load your dashboard." : "";
  const activeEvents = myEvents.filter(
    (e) => e.status === "live" || e.status === "paused",
  ).length;

  return (
    <main className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 md:py-10 lg:px-10">
      {/* ── Header ── */}
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-white/50">{today}</p>
          <h1 className="font-outfit mt-1 text-[28px] leading-tight font-semibold tracking-[-0.01em] text-white sm:text-[36px]">
            {greeting}, {firstName}
          </h1>
        </div>
        <div className="hidden gap-2 md:flex">
          <Link
            href="/host-dashboard/scan"
            className="flex h-11 items-center gap-2 rounded-full border border-white/15 px-5 text-sm font-semibold text-white transition hover:bg-white/[0.06]"
          >
            <ScanLine className="h-4 w-4" /> Scan tickets
          </Link>
          <Link
            href="/host-dashboard/experiences/new"
            className="flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-[#080914] transition hover:bg-white/90"
          >
            <Plus className="h-4 w-4" /> Create event
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
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
        <div className="space-y-6 sm:space-y-8">
          {!isVerified && (
            <VerifyToEarnCard
              applicationStatus={applicationStatus}
              isPhoneVerified={myHost?.is_phone_verified}
              isIdentityVerified={myHost?.is_identity_verified}
            />
          )}

          {/* ── Needs attention: swipeable on phones ── */}
          {attention.length > 0 && (
            <section aria-label="Needs attention">
              <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
                {attention.map((a, i) => (
                  <Link
                    key={i}
                    href={a.href}
                    className={`${CARD} flex w-[82%] shrink-0 snap-start items-start gap-3 p-4 transition hover:border-[#A020F0]/40 sm:w-auto`}
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${a.tone}`}
                    >
                      <a.icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-white">
                        {a.title}
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-[13px] text-white/55">
                        {a.description}
                      </span>
                      <span className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-[#D8B4FE]">
                        {a.cta} <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ── Key numbers ── */}
          <section
            aria-label="Key numbers"
            className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
          >
            {isVerified ? (
              <Stat
                label="Earned this month"
                value={inr(thisMonth?.earnings ?? 0)}
                foot={`${inr(dashboard?.total_earnings_cents ?? 0)} all time`}
                icon={Wallet}
                href="/host-dashboard/earnings"
                trend={pctChange(thisMonth?.earnings, lastMonth?.earnings)}
              />
            ) : (
              <Stat
                label="Active events"
                value={`${activeEvents}/${FREE_HOST_LIMITS.maxActiveEvents}`}
                foot="Free host limit"
                icon={CalendarDays}
                href="/host-dashboard/experiences"
              />
            )}
            <Stat
              label="Bookings this month"
              value={String(thisMonth?.bookings ?? 0)}
              foot={`${dashboard?.total_bookings ?? 0} all time`}
              icon={Ticket}
              href="/host-dashboard/bookings"
              trend={pctChange(thisMonth?.bookings, lastMonth?.bookings)}
            />
            <Stat
              label="Next 7 days"
              value={String(weekAhead + todaySessions.length)}
              foot={`${todaySessions.length} session${todaySessions.length === 1 ? "" : "s"} today`}
              icon={CalendarDays}
              href="/host-dashboard/calendar"
            />
            <Stat
              label="Rating"
              value={rating > 0 ? `${rating.toFixed(1)}★` : "–"}
              foot={`${dashboard?.total_reviews ?? 0} reviews`}
              icon={Star}
              href="/host-dashboard/profile"
            />
          </section>

          {/* ── Quick actions ── */}
          <section aria-label="Quick actions">
            <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-6">
              {ACTIONS.map((a) => {
                const inner = (
                  <>
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#A020F0]/15 text-[#D8B4FE] transition group-hover:bg-[#A020F0]/25">
                      <a.icon className="h-5 w-5" />
                    </span>
                    <span className="text-[13px] leading-tight font-medium text-white/85">
                      {a.label}
                    </span>
                  </>
                );
                const cls = `${CARD} group flex flex-col items-center gap-2 rounded-2xl px-2 py-4 text-center transition hover:border-[#A020F0]/40`;
                return a.href ? (
                  <Link key={a.label} href={a.href} className={cls}>
                    {inner}
                  </Link>
                ) : (
                  <button
                    key={a.label}
                    type="button"
                    onClick={a.onClick}
                    className={cls}
                  >
                    {inner}
                  </button>
                );
              })}
            </div>
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
            {/* ── Left column ── */}
            <div className="min-w-0 space-y-6 sm:space-y-8">
              <section className={`${CARD} p-4 sm:p-6`}>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className={SECTION_H}>
                    Today
                    {todaySessions.length > 0 && (
                      <span className="ml-2 text-sm font-medium text-white/40">
                        {todaySessions.length}
                      </span>
                    )}
                  </h2>
                  <Link href="/host-dashboard/calendar" className={LINK}>
                    Calendar
                  </Link>
                </div>
                {todaySessions.length === 0 ? (
                  <Empty
                    icon={CalendarDays}
                    text="Nothing on today. Enjoy the quiet."
                    cta="Open calendar"
                    href="/host-dashboard/calendar"
                  />
                ) : (
                  <div className="divide-y divide-white/[0.06]">
                    {(allToday ? todaySessions : todaySessions.slice(0, 3)).map(
                      (ev) => (
                        <SessionRow
                          key={`${ev.id}-${ev.time}`}
                          ev={ev}
                          hostId={hostId}
                        />
                      ),
                    )}
                  </div>
                )}
                {todaySessions.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setAllToday((v) => !v)}
                    className="mt-4 h-11 w-full rounded-full border border-white/10 text-sm font-semibold text-white/80 transition hover:bg-white/[0.05]"
                  >
                    {allToday
                      ? "Show less"
                      : `Show all ${todaySessions.length} sessions`}
                  </button>
                )}
              </section>

              <section className={`${CARD} p-4 sm:p-6`}>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className={SECTION_H}>Coming up</h2>
                  <Link href="/host-dashboard/calendar" className={LINK}>
                    See all
                  </Link>
                </div>
                {upcoming.length === 0 ? (
                  <Empty
                    icon={Plus}
                    text="No upcoming sessions. Add dates to start taking bookings."
                    cta="Create event"
                    href="/host-dashboard/experiences/new"
                  />
                ) : (
                  <div className="divide-y divide-white/[0.06]">
                    {upcoming.slice(0, 5).map((ev) => (
                      <SessionRow
                        key={`${ev.id}-${ev.time}`}
                        ev={ev}
                        hostId={hostId}
                        showDate
                      />
                    ))}
                  </div>
                )}
              </section>

              <EarningsChart points={chartPoints} />
            </div>

            {/* ── Right column ── */}
            <aside className="min-w-0 space-y-6 sm:space-y-8">
              <section className={`${CARD} p-4 sm:p-6`}>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className={SECTION_H}>Latest bookings</h2>
                  <Link href="/host-dashboard/bookings" className={LINK}>
                    All
                  </Link>
                </div>
                {liveSales.length === 0 ? (
                  <p className="py-4 text-sm text-white/50">
                    New bookings will show up here.
                  </p>
                ) : (
                  <ul className="space-y-4">
                    {liveSales.slice(0, 5).map((s) => (
                      <li key={s.BookingID} className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={
                            s.BuyerAvatarURL ??
                            "/assets/home/avatar-placeholder.svg"
                          }
                          alt=""
                          referrerPolicy="no-referrer"
                          className="h-10 w-10 shrink-0 rounded-full object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">
                            {s.BuyerName || "Guest"}
                            {s.Quantity > 1 && (
                              <span className="font-normal text-white/50">
                                {" "}
                                × {s.Quantity}
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
                    ))}
                  </ul>
                )}
              </section>

              <section className={`${CARD} p-4 sm:p-6`}>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className={SECTION_H}>
                    Your events
                    {myEvents.length > 0 && (
                      <span className="ml-2 text-sm font-medium text-white/40">
                        {myEvents.length}
                      </span>
                    )}
                  </h2>
                  <Link href="/host-dashboard/experiences" className={LINK}>
                    Manage
                  </Link>
                </div>
                {myEvents.length === 0 ? (
                  <Empty
                    icon={Ticket}
                    text="You haven't created an event yet."
                    cta="Create your first event"
                    href="/host-dashboard/experiences/new"
                  />
                ) : (
                  <ul className="space-y-3">
                    {myEvents.slice(0, 4).map((ev) => (
                      <li key={ev.id} className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={ev.cover_image_url ?? "/assets/home/hiking.webp"}
                          alt=""
                          loading="lazy"
                          className="h-12 w-12 shrink-0 rounded-xl object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/host-dashboard/experiences/${ev.id}`}
                            className="line-clamp-1 text-sm font-semibold text-white hover:text-[#E9D8FD]"
                          >
                            {ev.title}
                          </Link>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-white/50">
                            <span
                              className={`rounded-full px-1.5 py-px text-[10px] font-semibold capitalize ${
                                ev.status === "live"
                                  ? "bg-emerald-500/15 text-emerald-300"
                                  : ev.status === "paused"
                                    ? "bg-amber-500/15 text-amber-300"
                                    : "bg-white/10 text-white/60"
                              }`}
                            >
                              {ev.status}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setCodesEvent({ id: ev.id, title: ev.title })
                              }
                              className="transition hover:text-[#D8B4FE]"
                            >
                              Codes
                            </button>
                          </div>
                        </div>
                        <EventActionsMenu
                          event={{
                            id: ev.id,
                            slug: ev.slug,
                            title: ev.title,
                            is_recurring: ev.is_recurring ?? false,
                            status: ev.status,
                          }}
                          hostId={hostId}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Host tip */}
              <section className="relative overflow-hidden rounded-3xl border border-[#652A91]/50 bg-gradient-to-br from-[#241333] to-[#121426] p-5">
                <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-[#A020F0]/30 blur-3xl" />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-[#D8B4FE] uppercase">
                      <Lightbulb className="h-4 w-4" /> Host tip
                    </span>
                    <span className="flex gap-1">
                      <button
                        type="button"
                        aria-label="Previous tip"
                        onClick={() =>
                          setTip((t) => (t - 1 + TIPS.length) % TIPS.length)
                        }
                        className="rounded-full p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Next tip"
                        onClick={() => setTip((t) => (t + 1) % TIPS.length)}
                        className="rounded-full p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </span>
                  </div>
                  <p className="font-outfit mt-3 text-base font-semibold text-white">
                    {TIPS[tip]!.title}
                  </p>
                  <p className="mt-1 text-sm text-white/60">
                    {TIPS[tip]!.desc}
                  </p>
                </div>
              </section>

              {attention.length === 0 && (
                <p className="flex items-center gap-2 px-1 text-sm text-white/45">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  You&apos;re all caught up.
                </p>
              )}
            </aside>
          </div>
        </div>
      )}

      {/* Modals */}
      {hostId && (
        <>
          <HostOnSpotPickerModal
            hostId={hostId}
            events={myEvents}
            isOpen={onSpot}
            onClose={() => setOnSpot(false)}
            onBooked={refreshAfterBooking}
          />
          <HostOnSpotPickerModal
            hostId={hostId}
            events={myEvents}
            mode="bulk-import"
            isOpen={bulk}
            onClose={() => setBulk(false)}
            onBooked={refreshAfterBooking}
          />
          <HostCodesPickerModal
            hostId={hostId}
            events={myEvents}
            isOpen={codesPicker}
            onClose={() => setCodesPicker(false)}
          />
          {codesEvent && (
            <ManageCodesModal
              eventId={codesEvent.id}
              eventTitle={codesEvent.title}
              hostId={hostId}
              isOpen
              onClose={() => setCodesEvent(null)}
            />
          )}
        </>
      )}
    </main>
  );
}
