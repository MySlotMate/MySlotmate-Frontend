"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "~/utils/firebase";
import { HostNavbar, EarningsChart } from "~/components/host-dashboard";
import ManageCodesModal from "~/components/host-dashboard/ManageCodesModal";
import type { ChartPoint } from "~/components/host-dashboard";
import Breadcrumb from "~/components/Breadcrumb";
import { formatIST } from "~/lib/datetime";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FiCalendar,
  FiStar,
  FiClock,
  FiMapPin,
  FiMoreHorizontal,
  FiEye,
  FiEdit2,
  FiPause,
  FiPlay,
} from "react-icons/fi";
import {
  LuCalendarDays,
  LuCalendarX2,
  LuBookOpen,
  LuStar,
  LuMessageSquare,
  LuAlertTriangle,
  LuWallet,
  LuLightbulb,
  LuCheckCircle,
  LuPlus,
  LuUserPlus,
  LuChevronLeft,
  LuChevronRight,
  LuLoader2,
  LuKeyRound,
  LuFileSpreadsheet,
} from "react-icons/lu";
import {
  useHostDashboard,
  useCalendarEvents,
  useTodaySchedule,
  usePayoutHistory,
  useHostSales,
  useHostAttentionItems,
  usePauseEvent,
  useResumeEvent,
  useEventsByHost,
} from "~/hooks/useApi";
import type { AttentionItemDTO } from "~/lib/api";
import { PauseExperienceModal } from "~/components/PauseExperienceModal";
import HostOnSpotPickerModal from "~/components/host-dashboard/HostOnSpotPickerModal";
import HostCodesPickerModal from "~/components/host-dashboard/HostCodesPickerModal";

/* ------------------------------------------------------------------ */
/*  Attention items — driven by the /hosts/attention-items endpoint      */
/* ------------------------------------------------------------------ */

interface AttentionItem {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  linkText: string;
  linkHref: string;
}

const TONE = {
  info: "bg-[linear-gradient(135deg,#1fa7ff,#63ceff)]",
  warn: "bg-[linear-gradient(135deg,#f4795b,#f9a26c)]",
  amber: "bg-[linear-gradient(135deg,#f7b23b,#fcd271)]",
} as const;

/** Map a backend attention item ({ type, count, message }) to a UI card. */
function mapAttentionItem(it: AttentionItemDTO): AttentionItem {
  const many = (it.count ?? 0) > 1;
  switch (it.type) {
    case "cancelled_booking":
      return {
        icon: <LuCalendarX2 className="h-5 w-5 text-white" />,
        iconBg: TONE.warn,
        title: many ? "Cancelled bookings" : "Cancelled booking",
        description: it.message,
        linkText: "View bookings",
        linkHref: "/host-dashboard/bookings",
      };
    case "pending_review":
      return {
        icon: <LuStar className="h-5 w-5 text-white" />,
        iconBg: TONE.amber,
        title: "Awaiting guest reviews",
        description: it.message,
        linkText: "View requests",
        linkHref: "/host-dashboard/requests",
      };
    case "unread_message":
      return {
        icon: <LuMessageSquare className="h-5 w-5 text-white" />,
        iconBg: TONE.info,
        title: many ? "Unread messages" : "Unread message",
        description: it.message,
        linkText: "Open messages",
        linkHref: "/host-dashboard/messages",
      };
    case "low_rating":
      return {
        icon: <LuAlertTriangle className="h-5 w-5 text-white" />,
        iconBg: TONE.warn,
        title: "Low average rating",
        description: it.message,
        linkText: "View profile",
        linkHref: "/host-dashboard/profile",
      };
    default:
      return {
        icon: <LuBookOpen className="h-5 w-5 text-white" />,
        iconBg: TONE.info,
        title: "Needs attention",
        description: it.message,
        linkText: "View dashboard",
        linkHref: "/host-dashboard",
      };
  }
}

function RupeeIcon({ className }: { className?: string }) {
  return <span className={className}>₹</span>;
}

// Helper to format currency
function fmtCurrency(cents: number): string {
  return `₹${(cents / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/* ------------------------------------------------------------------ */
/*  Schedule item dropdown menu (View / Edit / Pause)                  */
/* ------------------------------------------------------------------ */

function ScheduleItemMenu({
  event,
  hostId,
}: {
  event: {
    id: string;
    slug: string;
    title: string;
    is_recurring: boolean;
    status: string;
  };
  hostId: string | null;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const pauseEvent = usePauseEvent();
  const resumeEvent = useResumeEvent();
  const [open, setOpen] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const isPaused = event.status === "paused";

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const invalidateAfterMutation = async () => {
    if (!hostId) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["eventsByHost", hostId] }),
      queryClient.invalidateQueries({ queryKey: ["todaySchedule", hostId] }),
      queryClient.invalidateQueries({ queryKey: ["calendarEvents", hostId] }),
      queryClient.invalidateQueries({ queryKey: ["hostDashboard"] }),
    ]);
  };

  const handlePauseConfirm = (options: {
    pausedFrom?: string;
    pausedDate?: string;
  }) => {
    if (!hostId) {
      toast.error("Host id not found");
      return;
    }
    // Close the modal immediately so the host gets instant feedback; the
    // pause + cache invalidation run in the background.
    setShowPauseModal(false);
    pauseEvent.mutate(
      { eventId: event.id, hostId, ...options },
      {
        onSuccess: () => {
          toast.success("Experience paused");
          void invalidateAfterMutation();
        },
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Failed to pause"),
      },
    );
  };

  const handleResume = async () => {
    if (!hostId) {
      toast.error("Host id not found");
      return;
    }
    setOpen(false);
    try {
      await resumeEvent.mutateAsync({ eventId: event.id, hostId });
      toast.success("Experience resumed");
      await invalidateAfterMutation();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resume");
    }
  };

  return (
    <>
      <div ref={menuRef} className="relative self-start">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="text-gray-400 transition hover:text-gray-600"
          aria-label="More actions"
          aria-expanded={open}
        >
          <FiMoreHorizontal className="h-5 w-5" />
        </button>
        {open && (
          <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
            <button
              onClick={() => {
                setOpen(false);
                router.push(`/experience/${event.slug}`);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-50"
            >
              <FiEye className="h-4 w-4 text-gray-500" />
              View
            </button>
            <button
              onClick={() => {
                setOpen(false);
                router.push(`/host-dashboard/experiences/${event.id}`);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-50"
            >
              <FiEdit2 className="h-4 w-4 text-gray-500" />
              Edit
            </button>
            {isPaused ? (
              <button
                onClick={() => void handleResume()}
                disabled={resumeEvent.isPending}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-green-700 transition hover:bg-green-50 disabled:opacity-50"
              >
                <FiPlay className="h-4 w-4" />
                {resumeEvent.isPending ? "Resuming…" : "Resume"}
              </button>
            ) : (
              <button
                onClick={() => {
                  setOpen(false);
                  setShowPauseModal(true);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-amber-700 transition hover:bg-amber-50"
              >
                <FiPause className="h-4 w-4" />
                Pause
              </button>
            )}
          </div>
        )}
      </div>

      {hostId && (
        <PauseExperienceModal
          open={showPauseModal}
          event={event}
          hostId={hostId}
          onClose={() => setShowPauseModal(false)}
          onConfirm={handlePauseConfirm}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function HostDashboardPage() {
  const [user] = useAuthState(auth);
  const firstName = user?.displayName?.split(" ")[0] ?? "Host";

  const queryClient = useQueryClient();

  const [idToken, setIdToken] = useState<string | null>(null);
  useEffect(() => {
    if (user) {
      void user.getIdToken().then(setIdToken);
    } else {
      setIdToken(localStorage.getItem("msm_auth_token"));
    }
  }, [user]);

  const [userId, setUserId] = useState<string | null>(null);
  const [storedHostId, setStoredHostId] = useState<string | null>(null);
  useEffect(() => {
    setUserId(localStorage.getItem("msm_user_id"));
    setStoredHostId(localStorage.getItem("msm_host_id"));
  }, []);

  const {
    data: dashboard,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useHostDashboard(storedHostId, userId);

  const { data: calendarEvents } = useCalendarEvents(storedHostId);
  const { data: todayScheduleData } = useTodaySchedule(storedHostId);
  const { data: payoutHistory } = usePayoutHistory(storedHostId, idToken);
  const { data: hostSales } = useHostSales(idToken, { limit: 250, offset: 0 });
  const { data: attentionData } = useHostAttentionItems(storedHostId);
  const { data: hostExperiences, isLoading: experiencesLoading } =
    useEventsByHost(storedHostId);

  // Quick "codes & passkey" manager — which experience's panel is open.
  const [codesEvent, setCodesEvent] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const [greeting, setGreeting] = useState("Hello");
  useEffect(() => {
    const hr = new Date().getHours();
    if (hr < 12) setGreeting("Good morning");
    else if (hr < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  const [activeTab, setActiveTab] = useState<"today" | "all">("all");

  const [showOnSpotPicker, setShowOnSpotPicker] = useState(false);
  const [showBulkImportPicker, setShowBulkImportPicker] = useState(false);
  const [showCodesPicker, setShowCodesPicker] = useState(false);

  const [tipIndex, setTipIndex] = useState(0);
  const HOST_TIPS = [
    {
      title: "Add Visual Previews",
      desc: "Adding video previews to your experience page increases booking conversion rate by up to 20% on average.",
    },
    {
      title: "Optimize Session Timing",
      desc: "Sessions scheduled in early mornings or evenings during weekends attract up to 35% higher attendance.",
    },
    {
      title: "Be a Highly Responsive Host",
      desc: "Replying to guest queries within 1 hour increases your chance of booking conversions by 3x.",
    },
  ];
  const nextTip = () => setTipIndex((prev) => (prev + 1) % HOST_TIPS.length);
  const prevTip = () =>
    setTipIndex((prev) => (prev - 1 + HOST_TIPS.length) % HOST_TIPS.length);

  /* Bucket sales into the trailing 6 months (IST) for the overview chart.
   * Cancelled / refunded sales are excluded so the trend reflects real income.
   * Each anchor sits mid-month at noon so IST conversion never spills into a
   * neighbouring month. */
  const chartPoints = useMemo<ChartPoint[]>(() => {
    const now = new Date();
    const buckets = Array.from({ length: 6 }, (_, idx) => {
      const i = 5 - idx;
      const anchor = new Date(now.getFullYear(), now.getMonth() - i, 15, 12);
      return {
        key: formatIST(anchor, "yyyy-MM"),
        label: formatIST(anchor, "MMM"),
        earnings: 0,
        bookings: 0,
      };
    });
    const indexByKey = new Map(buckets.map((b, i) => [b.key, i]));
    for (const s of hostSales ?? []) {
      if (s.Status === "cancelled" || s.Status === "refunded") continue;
      const i = indexByKey.get(formatIST(s.CreatedAt, "yyyy-MM"));
      if (i === undefined) continue;
      buckets[i]!.earnings += s.NetEarningCents ?? s.AmountCents ?? 0;
      buckets[i]!.bookings += 1;
    }
    return buckets.map(({ label, earnings, bookings }) => ({
      label,
      earnings,
      bookings,
    }));
  }, [hostSales]);

  const error = !storedHostId
    ? "No host profile found. Please apply as a host first."
    : queryError
      ? `Could not load dashboard. ${queryError instanceof Error ? queryError.message : "Please try again."}`
      : "";

  /* Use todayScheduleData if available, otherwise filter from calendarEvents.
   * Drafts are excluded — they're work-in-progress and shouldn't surface on the
   * dashboard's "today" list. */
  const todaySchedule = useMemo(() => {
    if (todayScheduleData && todayScheduleData.length > 0) {
      return todayScheduleData
        .filter((ev) => ev.status !== "draft")
        .sort(
          (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
        );
    }
    if (!calendarEvents) return [];
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    return calendarEvents
      .filter(
        (ev) => ev.status !== "draft" && ev.time.slice(0, 10) === todayStr,
      )
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  }, [todayScheduleData, calendarEvents]);

  /* Build attention items from the backend feed + a recent-payout note. */
  const attentionItems = useMemo<AttentionItem[]>(() => {
    const items = (attentionData ?? []).map(mapAttentionItem);

    // Append the most recent completed payout as a positive note.
    if (payoutHistory && payoutHistory.length > 0) {
      const recentPayout = payoutHistory.find((p) => p.status === "completed");
      if (recentPayout) {
        items.push({
          icon: <LuWallet className="h-5 w-5 text-white" />,
          iconBg: "bg-[linear-gradient(135deg,#1fbe74,#5fd99e)]",
          title: "Payout processed",
          description: `${fmtCurrency(recentPayout.amount_cents)} has been sent to your account.`,
          linkText: "View history",
          linkHref: "/host-dashboard/earnings",
        });
      }
    }

    return items;
  }, [attentionData, payoutHistory]);

  /* Build stats from API data or fallback */
  const d = dashboard as unknown as Record<string, number | string | undefined>;
  const earningsCents = (d?.total_earnings_cents as number) || 0;
  const totalEarnings = `₹${(earningsCents / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  const rating = (d?.avg_rating as number) || 0;
  const avgRating = rating > 0 ? rating.toFixed(1) : "–";

  const totalBookings = (d?.total_bookings as number) || 0;
  const totalEvents = (d?.total_events as number) || 0;

  const STATS = [
    {
      icon: <FiCalendar className="h-5 w-5 text-indigo-500" />,
      iconBg: "bg-indigo-50",
      label: "Total Events",
      value: String(totalEvents),
      sub: "Events",
      badge: "All time",
      badgeColor: "bg-indigo-50 text-indigo-600 border border-indigo-100",
      glowColor:
        "hover:border-indigo-300 hover:shadow-[0_10px_25px_rgba(99,102,241,0.06)]",
      href: "/host-dashboard/experiences",
    },
    {
      icon: <LuCalendarDays className="h-5 w-5 text-sky-500" />,
      iconBg: "bg-sky-50",
      label: "Total Bookings",
      value: String(totalBookings),
      sub: "Booked",
      badge: "All time",
      badgeColor: "bg-sky-50 text-sky-600 border border-sky-100",
      glowColor:
        "hover:border-sky-300 hover:shadow-[0_10px_25px_rgba(56,189,248,0.06)]",
      href: "/host-dashboard/bookings",
    },
    {
      icon: (
        <RupeeIcon className="inline-flex h-5 w-5 items-center justify-center font-semibold text-emerald-500" />
      ),
      iconBg: "bg-emerald-50",
      label: "Total Earnings",
      value: totalEarnings,
      sub: "",
      badge: "All time",
      badgeColor: "bg-emerald-50 text-emerald-600 border border-emerald-100",
      glowColor:
        "hover:border-emerald-300 hover:shadow-[0_10px_25px_rgba(16,185,129,0.06)]",
      href: "/host-dashboard/earnings",
    },
    {
      icon: <FiStar className="h-5 w-5 text-amber-500" />,
      iconBg: "bg-amber-50",
      label: "Avg Rating",
      value: avgRating,
      sub: avgRating !== "–" ? "★★★★★" : "",
      badge: `${dashboard?.total_reviews ?? 0} reviews`,
      badgeColor: "bg-slate-50 text-slate-600 border border-slate-100",
      glowColor:
        "hover:border-amber-300 hover:shadow-[0_10px_25px_rgba(245,158,11,0.06)]",
      href: "/host-dashboard/experiences",
    },
  ] as const;

  const QUICK_ACTIONS = [
    {
      title: "Create Experience",
      desc: "Host a new session",
      href: "/host-dashboard/experiences/new",
      icon: <LuPlus className="h-5 w-5 text-emerald-500" />,
      color:
        "bg-emerald-50/50 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200 border-gray-100",
    },
    {
      title: "Manage Bookings",
      desc: "View guests & details",
      href: "/host-dashboard/bookings",
      icon: <LuBookOpen className="h-5 w-5 text-purple-500" />,
      color:
        "bg-purple-50/50 text-purple-700 hover:bg-purple-50 hover:border-purple-200 border-gray-100",
    },
    {
      title: "Host Calendar",
      desc: "View schedules & dates",
      href: "/host-dashboard/calendar",
      icon: <LuCalendarDays className="h-5 w-5 text-sky-500" />,
      color:
        "bg-sky-50/50 text-sky-700 hover:bg-sky-50 hover:border-sky-200 border-gray-100",
    },
    {
      title: "Earnings History",
      desc: "View payouts & bills",
      href: "/host-dashboard/earnings",
      icon: <LuWallet className="h-5 w-5 text-amber-500" />,
      color:
        "bg-amber-50/50 text-amber-700 hover:bg-amber-50 hover:border-amber-200 border-gray-100",
    },
  ];

  return (
    <div className="font-manrope min-h-screen bg-[#f8fafc] text-[#16304c]">
      <HostNavbar />

      <main className="site-x mx-auto max-w-7xl py-6 sm:py-8">
        <Breadcrumb
          items={[{ label: "Home", href: "/" }, { label: "Dashboard" }]}
          className="mb-5 sm:mb-6"
        />

        {/* Loading state */}
        {loading && (
          <div className="flex min-h-[45vh] items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <LuLoader2 className="h-10 w-10 animate-spin text-[#0e8ae0]" />
              <p className="text-sm font-semibold text-gray-400">
                Loading your host portal...
              </p>
            </div>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="mb-6 flex items-center justify-between rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4 text-sm text-amber-700 shadow-sm">
            <div className="flex items-center gap-2">
              <LuAlertTriangle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
            {queryError && (
              <button
                onClick={() => refetch()}
                className="ml-4 font-bold underline hover:text-amber-900"
              >
                Retry
              </button>
            )}
          </div>
        )}

        {!loading && (
          <div className="space-y-6">
            {/* ── Greeting hero ── */}
            <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0094CA] via-[#0e8ae0] to-[#38bdf8] p-6 text-white shadow-[0_20px_50px_rgba(0,148,202,0.15)] sm:p-8">
              {/* glowing decorative blobs */}
              <div className="pointer-events-none absolute -top-24 -right-12 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 left-1/4 h-48 w-48 rounded-full bg-white/5 blur-3xl" />

              <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        user?.photoURL ?? "/assets/home/avatar-placeholder.png"
                      }
                      alt={firstName}
                      referrerPolicy="no-referrer"
                      className="hidden h-16 w-16 shrink-0 rounded-2xl border-2 border-white/20 object-cover shadow-lg sm:block"
                    />
                    <span className="absolute right-0 bottom-0 hidden h-3.5 w-3.5 animate-pulse rounded-full border-2 border-[#0094CA] bg-emerald-400 sm:block" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold tracking-wider text-white/70 uppercase">
                      {greeting} 👋
                    </p>
                    <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight sm:text-3xl">
                      Welcome back, {firstName}
                    </h1>
                    <p className="mt-1 max-w-md text-sm text-white/90">
                      Let&apos;s check what needs your attention or review your
                      schedule for today.
                    </p>
                  </div>
                </div>

                <div className="flex w-full items-center gap-2.5 sm:w-auto">
                  <Link
                    href="/host-dashboard/profile"
                    className="flex h-11 flex-1 items-center justify-center rounded-xl border border-white/25 bg-white/10 px-3 text-center text-xs font-bold whitespace-nowrap text-white backdrop-blur-md transition hover:bg-white/20 sm:flex-initial sm:px-5 sm:text-sm"
                  >
                    Edit Profile
                  </Link>
                  <Link
                    href="/host-dashboard/experiences/new"
                    className="flex h-11 flex-1 items-center justify-center rounded-xl bg-white px-3 text-center text-xs font-extrabold whitespace-nowrap text-[#0094CA] shadow-md transition hover:-translate-y-0.5 hover:shadow-lg sm:flex-initial sm:px-5 sm:text-sm"
                  >
                    + Create Experience
                  </Link>
                </div>
              </div>
            </div>

            {/* ── Stats cards ── */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {STATS.map((s, i) => (
                <Link
                  key={i}
                  href={s.href}
                  className={`group flex flex-col rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.01)] transition-all duration-300 hover:-translate-y-0.5 ${s.glowColor}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-105 ${s.iconBg}`}
                    >
                      {s.icon}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${s.badgeColor}`}
                    >
                      {s.badge}
                    </span>
                  </div>
                  <p className="mt-4 text-xs font-semibold tracking-wider text-[#6f8daa] uppercase">
                    {s.label}
                  </p>
                  <div className="mt-1 flex items-baseline gap-1">
                    <p className="text-2xl font-extrabold tracking-tight text-[#16304c] sm:text-3xl">
                      {s.value}
                    </p>
                    {s.sub && (
                      <span className="ml-1 text-xs font-semibold text-[#9fb3c8]">
                        {s.sub}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {/* ── Quick Actions Hub ── */}
            <div>
              <h2 className="mb-3 text-sm font-extrabold tracking-wider text-[#6f8daa] uppercase">
                Quick Actions
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {QUICK_ACTIONS.map((act, i) => (
                  <Link
                    key={i}
                    href={act.href}
                    className={`flex items-center gap-3 rounded-2xl border p-4 shadow-[0_8px_30px_rgb(0,0,0,0.005)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(0,0,0,0.02)] ${act.color}`}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm transition-transform duration-300 group-hover:scale-105">
                      {act.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs leading-none font-extrabold tracking-tight text-gray-800">
                        {act.title}
                      </p>
                      <p className="mt-1 truncate text-[10px] font-semibold text-gray-400">
                        {act.desc}
                      </p>
                    </div>
                  </Link>
                ))}

                {/* On-spot booking — opens an event picker, then the booking
                    modal. A button (not a link) since it's a per-event flow. */}
                <button
                  type="button"
                  onClick={() => setShowOnSpotPicker(true)}
                  className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-sky-50/50 p-4 text-left text-sky-700 shadow-[0_8px_30px_rgb(0,0,0,0.005)] transition-all duration-300 hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-50 hover:shadow-[0_12px_24px_rgba(0,0,0,0.02)]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm transition-transform duration-300 group-hover:scale-105">
                    <LuUserPlus className="h-5 w-5 text-[#0094CA]" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs leading-none font-extrabold tracking-tight text-gray-800">
                      On-spot Booking
                    </p>
                    <p className="mt-1 truncate text-[10px] font-semibold text-gray-400">
                      Book a walk-in guest
                    </p>
                  </div>
                </button>

                {/* Bulk add — the same guest-entry job as on-spot, from a
                    spreadsheet. Reuses the picker in bulk-import mode. */}
                <button
                  type="button"
                  onClick={() => setShowBulkImportPicker(true)}
                  className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-sky-50/50 p-4 text-left text-sky-700 shadow-[0_8px_30px_rgb(0,0,0,0.005)] transition-all duration-300 hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-50 hover:shadow-[0_12px_24px_rgba(0,0,0,0.02)]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm transition-transform duration-300 group-hover:scale-105">
                    <LuFileSpreadsheet className="h-5 w-5 text-[#0094CA]" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs leading-none font-extrabold tracking-tight text-gray-800">
                      Bulk Add Bookings
                    </p>
                    <p className="mt-1 truncate text-[10px] font-semibold text-gray-400">
                      Upload a guest list
                    </p>
                  </div>
                </button>

                {/* Codes & passkey — opens an experience picker, then the codes
                    manager (private passkey + access / free coupon codes). */}
                <button
                  type="button"
                  onClick={() => setShowCodesPicker(true)}
                  className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-sky-50/50 p-4 text-left text-sky-700 shadow-[0_8px_30px_rgb(0,0,0,0.005)] transition-all duration-300 hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-50 hover:shadow-[0_12px_24px_rgba(0,0,0,0.02)]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm transition-transform duration-300 group-hover:scale-105">
                    <LuKeyRound className="h-5 w-5 text-[#0094CA]" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs leading-none font-extrabold tracking-tight text-gray-800">
                      Codes &amp; Passkey
                    </p>
                    <p className="mt-1 truncate text-[10px] font-semibold text-gray-400">
                      Passkey &amp; coupon codes
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* ── Earnings / bookings trend chart ── */}
            <div>
              <EarningsChart points={chartPoints} />
            </div>

            {/* ── Main content grid: Sessions/Experiences vs Attention/Insights ── */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Left Side (2/3 width) - Tabbed Hub */}
              <div className="space-y-4 lg:col-span-2">
                {/* Tab buttons */}
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <div className="flex gap-6">
                    <button
                      onClick={() => setActiveTab("all")}
                      className={`relative pb-3 text-sm font-bold transition-all ${
                        activeTab === "all"
                          ? "text-[#0e8ae0]"
                          : "text-gray-400 hover:text-gray-600"
                      }`}
                    >
                      My Experiences
                      {hostExperiences && hostExperiences.length > 0 && (
                        <span className="ml-1.5 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-extrabold text-sky-600">
                          {hostExperiences.length}
                        </span>
                      )}
                      {activeTab === "all" && (
                        <div className="absolute bottom-0 left-0 h-0.5 w-full rounded-full bg-[#0e8ae0]" />
                      )}
                    </button>
                    <button
                      onClick={() => setActiveTab("today")}
                      className={`relative pb-3 text-sm font-bold transition-all ${
                        activeTab === "today"
                          ? "text-[#0e8ae0]"
                          : "text-gray-400 hover:text-gray-600"
                      }`}
                    >
                      Today&apos;s Sessions
                      {todaySchedule.length > 0 && (
                        <span className="ml-1.5 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-extrabold text-sky-600">
                          {todaySchedule.length}
                        </span>
                      )}
                      {activeTab === "today" && (
                        <div className="absolute bottom-0 left-0 h-0.5 w-full rounded-full bg-[#0e8ae0]" />
                      )}
                    </button>
                  </div>

                  {activeTab === "today" ? (
                    <Link
                      href="/host-dashboard/calendar"
                      className="text-xs font-bold text-[#0e8ae0] hover:underline"
                    >
                      View Calendar →
                    </Link>
                  ) : (
                    <Link
                      href="/host-dashboard/experiences"
                      className="text-xs font-bold text-[#0e8ae0] hover:underline"
                    >
                      Manage All →
                    </Link>
                  )}
                </div>

                {/* Tab content panels */}
                <div>
                  {activeTab === "today" ? (
                    /* Timeline Style */
                    <div className="relative ml-4 space-y-6 border-l border-sky-100 py-2 pl-6">
                      {todaySchedule.length === 0 && (
                        <div className="-ml-10 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#cfe6f8] bg-white p-10 text-center shadow-[0_8px_24px_-14px_rgba(58,119,172,0.18)]">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e8f4ff]">
                            <FiCalendar className="h-7 w-7 text-[#0e8ae0]" />
                          </div>
                          <p className="text-sm font-semibold text-gray-500">
                            No events scheduled for today
                          </p>
                          <Link
                            href="/host-dashboard/calendar"
                            className="rounded-xl bg-[#eaf5fe] px-4 py-2 text-sm font-semibold text-[#0e8ae0] transition hover:bg-[#d9eefc]"
                          >
                            Open calendar
                          </Link>
                        </div>
                      )}
                      {todaySchedule.map((item) => {
                        const startTime = new Date(item.time);
                        const endTime = item.end_time
                          ? new Date(item.end_time)
                          : null;
                        const fmt = (d: Date) =>
                          d.toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          });
                        const timeRange = endTime
                          ? `${fmt(startTime)} – ${fmt(endTime)}`
                          : fmt(startTime);
                        const now = new Date();
                        const diffMs = startTime.getTime() - now.getTime();
                        const isStartingSoon =
                          diffMs > 0 && diffMs < 60 * 60 * 1000;
                        const capacityPct = Math.min(
                          ((item.total_bookings ?? 0) / (item.capacity ?? 1)) *
                            100,
                          100,
                        );

                        return (
                          <div
                            key={item.id}
                            className="relative flex gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.005)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_15px_30px_-5px_rgba(0,0,0,0.03)]"
                          >
                            {/* Timeline bullet node */}
                            <div className="absolute top-6 -left-[31px] flex h-4 w-4 items-center justify-center rounded-full border-2 border-sky-400 bg-white">
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  isStartingSoon
                                    ? "animate-pulse bg-emerald-500"
                                    : item.status === "live"
                                      ? "bg-sky-500"
                                      : "bg-gray-400"
                                }`}
                              />
                            </div>

                            {/* Thumbnail */}
                            <img
                              src={
                                item.cover_image_url ??
                                "/assets/home/hiking.webp"
                              }
                              alt={item.title}
                              loading="lazy"
                              className="hidden h-28 w-40 shrink-0 rounded-xl object-cover sm:block"
                            />

                            {/* Info */}
                            <div className="flex flex-1 flex-col justify-between">
                              <div>
                                <div className="flex items-center justify-between">
                                  <span
                                    className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                      isStartingSoon
                                        ? "animate-pulse border border-emerald-100 bg-emerald-50 text-emerald-600"
                                        : item.status === "live"
                                          ? "border border-sky-100 bg-sky-50 text-sky-600"
                                          : "border border-amber-100 bg-amber-50 text-amber-600"
                                    }`}
                                  >
                                    {isStartingSoon
                                      ? "● Starting Soon"
                                      : item.status === "live"
                                        ? "Confirmed"
                                        : item.status}
                                  </span>
                                </div>
                                <h3 className="mt-2 text-base font-bold text-[#16304c]">
                                  {item.title}
                                </h3>
                                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#6f8daa]">
                                  <span className="flex items-center gap-1 font-semibold">
                                    <FiClock className="h-3.5 w-3.5 text-gray-400" />{" "}
                                    {timeRange}
                                  </span>
                                  {item.location && (
                                    <span className="flex items-center gap-1 font-semibold">
                                      <FiMapPin className="h-3.5 w-3.5 text-gray-400" />{" "}
                                      {item.location}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Progress bar */}
                              <div className="mt-3">
                                <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-[#6f8daa]">
                                  <span>Capacity booked</span>
                                  <span>
                                    {item.total_bookings ?? 0} /{" "}
                                    {item.capacity ?? 0}
                                  </span>
                                </div>
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-sky-400 to-sky-500"
                                    style={{ width: `${capacityPct}%` }}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Actions menu */}
                            <ScheduleItemMenu
                              event={{
                                id: item.id,
                                slug: item.slug,
                                title: item.title,
                                is_recurring: item.is_recurring ?? false,
                                status: item.status,
                              }}
                              hostId={storedHostId}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* My Experiences tab panel */
                    <div className="space-y-4">
                      {experiencesLoading && (
                        <div className="flex items-center justify-center py-10">
                          <LuLoader2 className="h-8 w-8 animate-spin text-sky-500" />
                        </div>
                      )}
                      {!experiencesLoading &&
                        (!hostExperiences || hostExperiences.length === 0) && (
                          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#cfe6f8] bg-white p-10 text-center shadow-[0_8px_24px_-14px_rgba(58,119,172,0.18)]">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e8f4ff]">
                              <LuBookOpen className="h-7 w-7 text-[#0e8ae0]" />
                            </div>
                            <p className="text-sm font-semibold text-gray-500">
                              No experiences created yet
                            </p>
                            <Link
                              href="/host-dashboard/experiences/new"
                              className="rounded-xl bg-[#eaf5fe] px-4 py-2 text-sm font-semibold text-[#0e8ae0] transition hover:bg-[#d9eefc]"
                            >
                              Create first experience
                            </Link>
                          </div>
                        )}
                      {!experiencesLoading &&
                        hostExperiences?.map((exp) => {
                          const isPaused = exp.status === "paused";
                          return (
                            <div
                              key={exp.id}
                              className="flex gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.005)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_15px_30px_-5px_rgba(0,0,0,0.03)]"
                            >
                              <img
                                src={
                                  exp.cover_image_url ??
                                  "/assets/home/hiking.webp"
                                }
                                alt={exp.title}
                                loading="lazy"
                                className="hidden h-24 w-32 shrink-0 rounded-xl object-cover sm:block"
                              />

                              <div className="flex flex-1 flex-col justify-between">
                                <div>
                                  <div className="flex items-center gap-2">
                                    {exp.mood && (
                                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-extrabold tracking-wider text-slate-500 uppercase">
                                        {exp.mood}
                                      </span>
                                    )}
                                    <span
                                      className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-extrabold tracking-wider uppercase ${
                                        isPaused
                                          ? "border border-amber-100 bg-amber-50 text-amber-600"
                                          : exp.status === "live"
                                            ? "border border-emerald-100 bg-emerald-50 text-emerald-600"
                                            : "border border-slate-100 bg-slate-50 text-slate-600"
                                      }`}
                                    >
                                      {exp.status}
                                    </span>
                                  </div>
                                  <h4 className="mt-1 line-clamp-1 text-sm font-extrabold text-[#16304c]">
                                    {exp.title}
                                  </h4>
                                  <p className="mt-1 line-clamp-1 text-xs font-medium text-[#6f8daa]">
                                    {exp.hook_line ??
                                      exp.description ??
                                      "No description provided."}
                                  </p>
                                </div>

                                <div className="mt-2 flex items-center justify-between gap-4">
                                  <span className="text-xs font-semibold text-gray-500">
                                    {exp.price_cents
                                      ? `₹${Math.round(exp.price_cents / 100)}`
                                      : "Free"}{" "}
                                    / slot
                                  </span>

                                  <div className="flex items-center gap-3">
                                    <Link
                                      href={`/experience/${exp.slug}`}
                                      className="text-xs font-bold text-[#6f8daa] transition hover:text-[#0e8ae0]"
                                    >
                                      View Page
                                    </Link>
                                    <button
                                      onClick={() =>
                                        setCodesEvent({
                                          id: exp.id,
                                          title: exp.title,
                                        })
                                      }
                                      className="text-xs font-bold text-[#6f8daa] transition hover:text-[#0e8ae0]"
                                    >
                                      Codes &amp; passkey
                                    </button>
                                    <Link
                                      href={`/host-dashboard/experiences/${exp.id}`}
                                      className="text-xs font-bold text-[#0e8ae0] hover:underline"
                                    >
                                      Edit Experience
                                    </Link>
                                  </div>
                                </div>
                              </div>

                              <ScheduleItemMenu
                                event={{
                                  id: exp.id,
                                  slug: exp.slug,
                                  title: exp.title,
                                  is_recurring: exp.is_recurring ?? false,
                                  status: exp.status,
                                }}
                                hostId={storedHostId}
                              />
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side (1/3 width) - Needs Attention, Target Goals & Tips */}
              <div className="space-y-6">
                {/* Needs Attention Panel */}
                <div>
                  <h2 className="mb-3 text-sm font-extrabold tracking-wider text-[#6f8daa] uppercase">
                    Needs Attention
                  </h2>
                  <div className="space-y-3">
                    {attentionItems.length === 0 ? (
                      <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.005)]">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                          <LuCheckCircle className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#16304c]">
                            You&apos;re all caught up
                          </p>
                          <p className="text-xs font-semibold text-[#6f8daa]">
                            No items need attention right now.
                          </p>
                        </div>
                      </div>
                    ) : (
                      attentionItems.map((item, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.005)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(0,0,0,0.02)]"
                        >
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.iconBg}`}
                          >
                            {item.icon}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-[#16304c]">
                              {item.title}
                            </p>
                            <p className="mt-0.5 text-xs leading-normal font-medium text-[#6f8daa]">
                              {item.description}
                            </p>
                            <Link
                              href={item.linkHref}
                              className="mt-1.5 inline-flex items-center gap-0.5 text-xs font-extrabold text-[#0e8ae0] hover:underline"
                            >
                              {item.linkText} →
                            </Link>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Target Progress Card */}
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.005)]">
                  <h3 className="mb-4 flex items-center justify-between text-sm font-extrabold text-[#16304c]">
                    <span>PRO HOST TARGETS</span>
                    <span className="rounded-full border border-sky-100 bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-[#0e8ae0]">
                      Tier 1
                    </span>
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <div className="mb-1 flex justify-between text-xs font-bold text-gray-500">
                        <span>Experiences Hosted</span>
                        <span>{totalEvents} / 10</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-sky-400 to-indigo-500"
                          style={{
                            width: `${Math.min((totalEvents / 10) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 flex justify-between text-xs font-bold text-gray-500">
                        <span>Earnings Target</span>
                        <span>{fmtCurrency(earningsCents)} / ₹10,000</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500"
                          style={{
                            width: `${Math.min((earningsCents / 100 / 10000) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Host Tip card slider */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0094CA] via-[#0e8ae0] to-[#57c7ff] p-5 text-white shadow-[0_18px_40px_-14px_rgba(0,148,202,0.25)]">
                  <div className="pointer-events-none absolute -top-10 -right-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                  <div className="relative">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                        <LuLightbulb className="h-5 w-5 text-amber-300" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={prevTip}
                          className="rounded-lg p-1 text-white/80 transition hover:bg-white/10"
                          aria-label="Previous tip"
                        >
                          <LuChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          onClick={nextTip}
                          className="rounded-lg p-1 text-white/80 transition hover:bg-white/10"
                          aria-label="Next tip"
                        >
                          <LuChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <h3 className="text-xs font-bold tracking-wider text-white/70 uppercase">
                      Host Tip
                    </h3>
                    <h4 className="mt-1 text-sm font-extrabold">
                      {HOST_TIPS[tipIndex]?.title}
                    </h4>
                    <p className="mt-2 min-h-[50px] text-xs leading-normal text-white/90">
                      {HOST_TIPS[tipIndex]?.desc}
                    </p>
                    <Link
                      href="/host-dashboard/experiences"
                      className="mt-4 block w-full rounded-xl bg-white py-2 text-center text-xs font-bold text-[#0094CA] shadow-sm transition hover:bg-sky-50"
                    >
                      Update Experiences
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* On-spot booking — dashboard quick-action entry point. */}
      {storedHostId && (
        <HostOnSpotPickerModal
          hostId={storedHostId}
          events={hostExperiences ?? []}
          isOpen={showOnSpotPicker}
          onClose={() => setShowOnSpotPicker(false)}
          onBooked={() => {
            void queryClient.invalidateQueries({
              queryKey: ["eventsByHost", storedHostId],
            });
            void queryClient.invalidateQueries({
              queryKey: ["todaySchedule", storedHostId],
            });
          }}
        />
      )}

      {/* Bulk booking import — same picker, spreadsheet flow. */}
      {storedHostId && (
        <HostOnSpotPickerModal
          hostId={storedHostId}
          events={hostExperiences ?? []}
          mode="bulk-import"
          isOpen={showBulkImportPicker}
          onClose={() => setShowBulkImportPicker(false)}
          onBooked={() => {
            void queryClient.invalidateQueries({
              queryKey: ["eventsByHost", storedHostId],
            });
            void queryClient.invalidateQueries({
              queryKey: ["todaySchedule", storedHostId],
            });
          }}
        />
      )}

      {/* Quick codes & passkey manager (from a My Experiences card) */}
      {codesEvent && storedHostId && (
        <ManageCodesModal
          eventId={codesEvent.id}
          eventTitle={codesEvent.title}
          hostId={storedHostId}
          isOpen={!!codesEvent}
          onClose={() => setCodesEvent(null)}
        />
      )}

      {/* Codes & passkey — Quick Actions entry point (pick an experience first) */}
      {storedHostId && (
        <HostCodesPickerModal
          hostId={storedHostId}
          events={hostExperiences ?? []}
          isOpen={showCodesPicker}
          onClose={() => setShowCodesPicker(false)}
        />
      )}
    </div>
  );
}
