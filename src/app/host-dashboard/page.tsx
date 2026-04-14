"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "~/utils/firebase";
import { HostNavbar } from "~/components/host-dashboard";
import Breadcrumb from "~/components/Breadcrumb";
import {
  FiCalendar,
  FiStar,
  FiClock,
  FiMapPin,
  FiMoreHorizontal,
} from "react-icons/fi";
import {
  LuCalendarDays,
  LuBookOpen,
  LuWallet,
  LuLightbulb,
} from "react-icons/lu";
import { useHostDashboard, useCalendarEvents, useTodaySchedule, usePayoutHistory } from "~/hooks/useApi";

/* ------------------------------------------------------------------ */
/*  Attention items (dynamic + static hints)                             */
/* ------------------------------------------------------------------ */

interface AttentionItem {
  icon: React.ReactNode;
  title: string;
  description: string;
  linkText: string;
  linkHref: string;
}

function RupeeIcon({ className }: { className?: string }) {
  return <span className={className}>₹</span>;
}

// Helper to format currency
function fmtCurrency(cents: number): string {
  return `₹${(cents / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Placeholder - will be replaced with dynamic version in component
const STATIC_ATTENTION_ITEMS: AttentionItem[] = [
  {
    icon: <LuBookOpen className="h-5 w-5 text-white" />,
    title: "2 Booking Received",
    description: "Pending approval for next week.",
    linkText: "View Experiences",
    linkHref: "/host-dashboard/experiences",
  },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function HostDashboardPage() {
  const [user] = useAuthState(auth);
  const firstName = user?.displayName?.split(" ")[0] ?? "Host";

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
  const { data: payoutHistory } = usePayoutHistory(storedHostId);

  const error = !storedHostId
    ? "No host profile found. Please apply as a host first."
    : queryError
      ? `Could not load dashboard. ${queryError instanceof Error ? queryError.message : "Please try again."}`
      : "";

  /* Use todayScheduleData if available, otherwise filter from calendarEvents */
  const todaySchedule = useMemo(() => {
    if (todayScheduleData && todayScheduleData.length > 0) {
      return todayScheduleData.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    }
    if (!calendarEvents) return [];
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    return calendarEvents
      .filter((ev) => ev.time.slice(0, 10) === todayStr)
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  }, [todayScheduleData, calendarEvents]);

  /* Build dynamic attention items with recent payouts */
  const attentionItems = useMemo(() => {
    const items = [...STATIC_ATTENTION_ITEMS];
    
    // Find most recent completed payout
    if (payoutHistory && payoutHistory.length > 0) {
      const completedPayouts = payoutHistory.filter(p => p.status === "completed");
      if (completedPayouts.length > 0) {
        const recentPayout = completedPayouts[0];
        if (recentPayout) {
          items.push({
            icon: <LuWallet className="h-5 w-5 text-white" />,
            title: "Payout Processed",
            description: `${fmtCurrency(recentPayout.amount_cents)} has been sent to your account.`,
            linkText: "View History",
            linkHref: "/host-dashboard/earnings",
          });
        }
      }
    }
    
    return items;
  }, [payoutHistory]);

  /* Build stats from API data or fallback */
  const d = dashboard as unknown as Record<string, number | string | undefined>;
  const earningsCents = (d?.total_earnings_cents as number) || 0;
  const totalEarnings = `₹${(earningsCents / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  
  const rating = (d?.avg_rating as number) || 0;
  const avgRating = rating > 0 ? rating.toFixed(1) : "–";
  
  const totalBookings = (d?.total_bookings as number) || 0;
  const totalEvents = (d?.total_events as number) || 0;

  const STATS = [
    {
      icon: <FiCalendar className="h-5 w-5 text-[#0094CA]" />,
      label: "Total Events",
      value: String(totalEvents),
      sub: "Events",
      badge: "All time",
      badgeColor: "bg-[#0094CA] text-white",
    },
    {
      icon: <LuCalendarDays className="h-5 w-5 text-[#0094CA]" />,
      label: "Total Bookings",
      value: String(totalBookings),
      sub: "Booked",
      badge: "All time",
      badgeColor: "bg-green-100 text-green-700",
    },
    {
      icon: <RupeeIcon className="inline-flex h-5 w-5 items-center justify-center text-[#0094CA]" />,
      label: "Total Earnings",
      value: totalEarnings,
      sub: "",
      badge: "All time",
      badgeColor: "bg-green-100 text-green-700",
    },
    {
      icon: <FiStar className="h-5 w-5 text-[#0094CA]" />,
      label: "Avg Rating",
      value: avgRating,
      sub: avgRating !== "–" ? "★★★★★" : "",
      badge: `${dashboard?.total_reviews ?? 0} reviews`,
      badgeColor: "bg-gray-100 text-gray-600",
    },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50">
      <HostNavbar />

      <main className="mx-auto max-w-7xl site-x py-8">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Dashboard" }]} className="mb-6" />
        
        {/* Loading state */}
        {loading && (
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0094CA] border-t-transparent" />
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="mb-4 flex items-center justify-between rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <span>{error}</span>
            {queryError && (
              <button
                onClick={() => refetch()}
                className="ml-4 font-semibold underline hover:text-amber-900"
              >
                Retry
              </button>
            )}
          </div>
        )}

        {!loading && (
          <>
        {/* ── Greeting row ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Hello, {firstName} 👋
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Here&apos;s what&apos;s happening with your experiences today.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/host-dashboard/profile"
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-800 transition hover:bg-gray-50"
            >
              ✏️ Edit Profile
            </Link>
            <Link
              href="/host-dashboard/experiences"
              className="rounded-lg bg-[#0094CA] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#007dab]"
            >
              My Experiences
            </Link>
          </div>
        </div>

        {/* ── Stats cards ── */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <div
              key={i}
              className="relative rounded-xl border border-gray-200 bg-white px-5 py-5"
            >
              {/* badge */}
              <span
                className={`absolute right-4 top-4 rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.badgeColor}`}
              >
                {s.badge}
              </span>
              <div className="mb-3">{s.icon}</div>
              <p className="text-xs font-medium text-gray-500">{s.label}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {s.value}
                <span className="ml-1 text-sm font-normal text-gray-400">
                  {s.sub}
                </span>
              </p>
            </div>
          ))}
        </div>

        {/* ── Body: Schedule + Attention ── */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Today's Schedule — 2/3 */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                Today&apos;s Schedule
              </h2>
              <Link
                href="/host-dashboard/calendar"
                className="text-sm font-medium text-[#0094CA] hover:underline"
              >
                View Calendar
              </Link>
            </div>

            <div className="mt-4 space-y-4">
              {todaySchedule.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center">
                  <p className="text-sm text-gray-400">No events scheduled for today</p>
                </div>
              )}
              {todaySchedule.map((item) => {
                const startTime = new Date(item.time);
                const endTime = item.end_time ? new Date(item.end_time) : null;
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
                const isStartingSoon = diffMs > 0 && diffMs < 60 * 60 * 1000;

                return (
                <div
                  key={item.id}
                  className="flex gap-4 rounded-xl border border-gray-200 bg-white p-4"
                >
                  {/* Thumbnail */}
                  {item.cover_image_url && (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.cover_image_url}
                        alt={item.title}
                        loading="lazy"
                        className="h-28 w-40 shrink-0 rounded-lg object-cover hidden sm:block"
                      />
                    </>
                  )}

                  {/* Info */}
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      {/* Status badge */}
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                          isStartingSoon
                            ? "bg-green-100 text-green-700"
                            : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {isStartingSoon
                          ? "● Starting Soon"
                          : item.status === "live" ? "Confirmed" : item.status}
                      </span>
                      <h3 className="mt-1.5 text-base font-semibold text-gray-900">
                        {item.title}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <FiClock className="h-3.5 w-3.5" /> {timeRange}
                        </span>
                        {item.location && (
                        <span className="flex items-center gap-1">
                          <FiMapPin className="h-3.5 w-3.5" /> {item.location}
                        </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom row */}
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {item.total_bookings} booked / {item.capacity} capacity
                      </span>
                      <button className="text-sm font-medium text-[#0094CA] hover:underline">
                        Manage Session
                      </button>
                    </div>
                  </div>

                  {/* More btn */}
                  <button className="self-start text-gray-400 hover:text-gray-600">
                    <FiMoreHorizontal className="h-5 w-5" />
                  </button>
                </div>
                );
              })}
            </div>
          </div>

          {/* Needs Attention — 1/3 */}
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Needs Attention
            </h2>
            <div className="mt-4 space-y-3">
              {attentionItems.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0094CA]">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {item.title}
                    </p>
                    <p className="text-xs text-gray-500">{item.description}</p>
                    <Link
                      href={item.linkHref}
                      className="mt-1 inline-block text-xs font-medium text-[#0094CA] hover:underline"
                    >
                      {item.linkText}
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Host Tip card */}
            <div className="mt-4 rounded-xl bg-[#0094CA] p-5 text-white">
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
                <LuLightbulb className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold">Host Tip</h3>
              <p className="mt-1 text-sm text-white/80">
                Adding video to your experience page increases bookings by 20%
                on average.
              </p>
              <button className="mt-4 w-full rounded-lg bg-white py-2.5 text-sm font-semibold text-[#0094CA] transition hover:bg-white/90">
                Add Video
              </button>
            </div>
          </div>
        </div>
        </>
        )}
      </main>
    </div>
  );
}
