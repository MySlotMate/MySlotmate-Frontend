"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FiEdit2,
  FiEye,
  FiMoreHorizontal,
  FiPause,
  FiPlay,
  FiTrendingUp,
} from "react-icons/fi";
import { BOOST_ENABLED } from "~/lib/boost";
import { boostHref } from "~/components/host-dashboard/boost/BoostButton";
import { usePauseEvent, useResumeEvent } from "~/hooks/useApi";
import { PauseExperienceModal } from "~/components/PauseExperienceModal";

/** "⋯" menu on an event row: view, edit, boost, pause or resume. */
export default function EventActionsMenu({
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
          className="flex h-9 w-9 items-center justify-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
          aria-label="More actions"
          aria-expanded={open}
        >
          <FiMoreHorizontal className="h-5 w-5" />
        </button>
        {open && (
          <div className="absolute right-0 z-30 mt-1 w-44 overflow-hidden rounded-xl border border-white/10 bg-[#121426] py-1 shadow-lg">
            <button
              onClick={() => {
                setOpen(false);
                router.push(`/experience/${event.slug}`);
              }}
              className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm text-white/80 transition hover:bg-white/[0.04]"
            >
              <FiEye className="h-4 w-4 text-[#A5A8C3]" />
              View
            </button>
            <button
              onClick={() => {
                setOpen(false);
                router.push(`/host-dashboard/experiences/${event.id}`);
              }}
              className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm text-white/80 transition hover:bg-white/[0.04]"
            >
              <FiEdit2 className="h-4 w-4 text-[#A5A8C3]" />
              Edit
            </button>
            {BOOST_ENABLED && event.status === "live" && (
              <button
                onClick={() => {
                  setOpen(false);
                  router.push(boostHref(event.id));
                }}
                className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm text-[#E9D5FF] transition hover:bg-[#B724EA]/10"
              >
                <FiTrendingUp className="h-4 w-4 text-[#D8B4FE]" />
                Boost this event
              </button>
            )}
            {isPaused ? (
              <button
                onClick={() => void handleResume()}
                disabled={resumeEvent.isPending}
                className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm text-green-300 transition hover:bg-green-500/10 disabled:opacity-50"
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
                className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm text-amber-300 transition hover:bg-amber-500/10"
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
