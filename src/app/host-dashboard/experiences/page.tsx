"use client";

import { useEventsByHost, useMyHost, useResumeEvent } from "~/hooks/useApi";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { HostNavbar } from "~/components/host-dashboard";
import Breadcrumb from "~/components/Breadcrumb";
import { FiSearch, FiStar, FiCalendar, FiEdit2, FiTrash2, FiEye } from "react-icons/fi";
import { LuBookOpen } from "react-icons/lu";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

/* ------------------------------------------------------------------ */
/*  Helper: relative time formatting                                   */
/* ------------------------------------------------------------------ */
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}H AGO`;
  if (diffDays === 1) return "1D AGO";
  if (diffDays < 7) return `${diffDays}D AGO`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}W AGO`;
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" }).toUpperCase();
}

function formatNextDate(dateStr: string | null): string {
  if (!dateStr) return "Not Scheduled";
  const date = new Date(dateStr);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === now.toDateString()) return "Today";
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ------------------------------------------------------------------ */
/*  Status Badge Component                                             */
/* ------------------------------------------------------------------ */
function StatusBadge({ status }: { status: string }) {
  const config = {
    live: { bg: "bg-green-500", text: "text-white", dot: "bg-white", label: "LIVE" },
    draft: { bg: "bg-gray-600", text: "text-white", dot: "bg-white", label: "DRAFT" },
    paused: { bg: "bg-amber-500", text: "text-white", dot: "bg-white", label: "PAUSED" },
  }[status] ?? { bg: "bg-gray-500", text: "text-white", dot: "bg-white", label: status.toUpperCase() };

  return (
    <span className={`inline-flex items-center gap-1 ${config.bg} ${config.text} px-2 py-0.5 rounded-full text-[10px] font-semibold`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Experience Card Component                                          */
/* ------------------------------------------------------------------ */
interface ExperienceCardProps {
  event: {
    id: string;
    title: string;
    hook_line: string | null;
    cover_image_url: string | null;
    status: string;
    time: string;
    avg_rating: number | null;
    total_bookings: number;
    total_reviews: number;
    created_at: string;
    updated_at: string;
    paused_at: string | null;
  };
  hostId: string;
  onResume: (eventId: string) => void;
  isResuming: boolean;
}

function ExperienceCard({ event, hostId: _hostId, onResume: _onResume, isResuming: _isResuming }: ExperienceCardProps) {
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  const nextDate = event.status === "paused" ? null : event.time;
  const isPaused = event.status === "paused";
  const isDraft = event.status === "draft";
  const isLive = event.status === "live";

  const footerText = isPaused
    ? `PAUSED ${formatRelativeTime(event.paused_at ?? event.updated_at)}`
    : isDraft
      ? `CREATED ${formatRelativeTime(event.created_at)}`
      : `LAST EDITED ${formatRelativeTime(event.updated_at)}`;

  const handleEdit = () => {
    router.push(`/host-dashboard/experiences/${event.id}`);
  };

  const handleViewBookings = () => {
    router.push(`/host-dashboard/experiences/${event.id}?tab=bookings`);
  };

  const handleDelete = async () => {
    if (!_hostId) return;
    setIsDeleting(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/events/${event.id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ host_id: _hostId }),
        }
      );
      
      if (!response.ok) {
        throw new Error("Failed to delete event");
      }
      
      toast.success("Experience deleted successfully!");
      await queryClient.invalidateQueries({ queryKey: ["events"] });
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error("Failed to delete event");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
      {/* Image with status badge */}
      <div className="relative h-44 bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={event.cover_image_url ?? "/assets/home/cover.svg"}
          alt={event.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-3 left-3">
          <StatusBadge status={event.status} />
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Title row */}
        <h3 className="text-base font-semibold text-gray-900 line-clamp-1">{event.title}</h3>

        {/* Info rows */}
        <div className="mt-3 space-y-2">
          {/* Next date */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <FiCalendar className="h-3.5 w-3.5" />
            <span>Next:</span>
            <span className={isPaused ? "text-amber-600 font-medium" : "text-gray-700"}>
              {isPaused ? "Paused" : formatNextDate(nextDate)}
            </span>
            {isLive && event.avg_rating !== null && (
              <>
                <span className="ml-auto flex items-center gap-1 text-gray-700">
                  <FiStar className="h-3.5 w-3.5 text-amber-400" />
                  {event.avg_rating.toFixed(1)}
                </span>
                <span className="text-[#0094CA]">({event.total_reviews})</span>
              </>
            )}
            {(isDraft || (isLive && event.avg_rating === null)) && (
              <span className="ml-auto text-gray-400">New</span>
            )}
          </div>

          {/* Bookings */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <LuBookOpen className="h-3.5 w-3.5" />
            <span className="text-gray-700">{event.total_bookings}</span>
            <span>Bookings total</span>
          </div>
        </div>

        {/* Action buttons and footer */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            {/* Edit button */}
            <div className="group relative">
              <button
                onClick={handleEdit}
                className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-400 hover:text-[#0094CA]"
                title="Edit"
              >
                <FiEdit2 className="h-4 w-4" />
              </button>
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none">
                Edit
              </span>
            </div>

            {/* View bookings button */}
            <div className="group relative">
              <button
                onClick={handleViewBookings}
                className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-400 hover:text-[#0094CA]"
                title="View Bookings"
              >
                <FiEye className="h-4 w-4" />
              </button>
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none">
                View Bookings
              </span>
            </div>

            {/* Delete button */}
            <div className="group relative ml-auto">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 hover:bg-red-50 rounded-lg transition text-gray-400 hover:text-red-600"
                title="Delete"
              >
                <FiTrash2 className="h-4 w-4" />
              </button>
              <span className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none">
                Delete
              </span>
            </div>
          </div>
          <span className="text-[10px] font-medium text-gray-400 tracking-wide">{footerText}</span>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <FiTrash2 className="text-red-600" size={24} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Delete {event.title}?</h2>
            <p className="text-gray-500 mb-6">
              This will permanently delete your experience. All confirmed bookings will be refunded.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-semibold transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Create New Card Component                                          */
/* ------------------------------------------------------------------ */
function CreateNewCard() {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push("/host-dashboard/experiences/new")}
      className="bg-white rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center min-h-70 cursor-pointer hover:border-[#0094CA] hover:bg-gray-50 transition group"
    >
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3 group-hover:bg-[#0094CA]/10">
        <span className="text-2xl text-gray-400 group-hover:text-[#0094CA]">+</span>
      </div>
      <h3 className="text-base font-semibold text-gray-900">Create New Experience</h3>
      <p className="text-xs text-gray-400 mt-1 text-center px-4">
        Ready to host something new? Get started with a new listing.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */
export default function ExperiencesPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [tab, setTab] = useState<"all" | "live" | "draft" | "paused">("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [resumingId, setResumingId] = useState<string | null>(null);

  useEffect(() => {
    setUserId(localStorage.getItem("msm_user_id"));
    setIsHydrated(true);
  }, []);

  const { data: host, isLoading: hostLoading } = useMyHost(userId);
  const { data: events, isLoading: eventsLoading, refetch: refetchEvents } = useEventsByHost(host?.id ?? null);
  const resumeEvent = useResumeEvent();

  useEffect(() => {
    if (isHydrated && !userId && !hostLoading) {
      router.push("/");
    }
  }, [userId, hostLoading, router, isHydrated]);

  // Tab counts
  const counts = useMemo(() => {
    const all = events?.length ?? 0;
    const live = events?.filter((e) => e.status === "live").length ?? 0;
    const draft = events?.filter((e) => e.status === "draft").length ?? 0;
    const paused = events?.filter((e) => e.status === "paused").length ?? 0;
    return { all, live, draft, paused };
  }, [events]);

  // Filtered, searched, and sorted events
  const filteredEvents = useMemo(() => {
    let filtered = events ?? [];
    if (tab !== "all") {
      filtered = filtered.filter((e) => e.status === tab);
    }
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.title.toLowerCase().includes(s) ||
          (e.hook_line?.toLowerCase().includes(s) ?? false)
      );
    }
    filtered = filtered.slice().sort((a, b) => {
      if (sort === "newest") {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      } else {
        return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      }
    });
    return filtered;
  }, [events, tab, search, sort]);

  const handleResume = async (eventId: string) => {
    if (!host?.id) return;
    setResumingId(eventId);
    try {
      await resumeEvent.mutateAsync({ eventId, hostId: host.id });
      await refetchEvents();
    } catch (error) {
      console.error("Failed to resume event:", error);
    } finally {
      setResumingId(null);
    }
  };

  if (hostLoading || eventsLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <HostNavbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0094CA] border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!host) {
    return (
      <div className="min-h-screen bg-gray-50">
        <HostNavbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-gray-500">Host profile not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <HostNavbar />

      <main className="mx-auto max-w-7xl site-x py-8">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Dashboard", href: "/host-dashboard" }, { label: "Experiences" }]} className="mb-6" />
        
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Experiences</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your listings, check availability, and view performance insights.
            </p>
          </div>
          <button
            onClick={() => router.push("/host-dashboard/experiences/new")}
            className="flex items-center gap-2 rounded-lg bg-[#0094CA] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#007dab]"
          >
            <span>+</span>
            Create New Experience
          </button>
        </div>

        {/* Tabs and Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-gray-200 pb-0">
            {[
              { key: "all" as const, label: "All Listings", count: counts.all },
              { key: "live" as const, label: "Live", count: counts.live },
              { key: "draft" as const, label: "Drafts", count: counts.draft },
              { key: "paused" as const, label: "Paused", count: counts.paused },
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`relative px-4 py-2 text-sm font-medium transition ${
                  tab === key
                    ? "text-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {label}
                <span
                  className={`ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                    tab === key
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {count}
                </span>
                {tab === key && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900" />
                )}
              </button>
            ))}
          </div>

          {/* Search and Sort */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title or keyword..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-64 rounded-full border border-gray-200 bg-white pl-10 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-[#0094CA] focus:outline-none focus:ring-1 focus:ring-[#0094CA]"
              />
            </div>
            <button
              onClick={() => setSort(sort === "newest" ? "oldest" : "newest")}
              className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              <svg
                width="16"
                height="16"
                fill="none"
                viewBox="0 0 24 24"
                className="text-gray-400"
              >
                <path
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  d="M3 6h18M3 12h12M3 18h6"
                />
              </svg>
              Sort by: <span className="font-semibold">{sort === "newest" ? "Newest" : "Oldest"}</span>
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.length > 0 ? (
            <>
              {filteredEvents.map((event) => (
                <ExperienceCard
                  key={event.id}
                  event={event}
                  hostId={host.id}
                  onResume={handleResume}
                  isResuming={resumingId === event.id}
                />
              ))}
              <CreateNewCard />
            </>
          ) : (
            <>
              <div className="col-span-full flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <LuBookOpen className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">No experiences found</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {search
                    ? "Try adjusting your search terms"
                    : "Create your first experience to get started"}
                </p>
                <button
                  onClick={() => router.push("/host-dashboard/experiences/new")}
                  className="mt-4 rounded-lg bg-[#0094CA] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#007dab]"
                >
                  Create New Experience
                </button>
              </div>
            </>
          )}
        </div>

        {/* Load More (placeholder) */}
        {filteredEvents.length > 6 && (
          <div className="mt-8 flex justify-center">
            <button className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700">
              Load More
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
