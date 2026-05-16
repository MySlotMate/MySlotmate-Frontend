"use client";

import { useState } from "react";
import { FiPause } from "react-icons/fi";
import { useEventOccurrencesForHost } from "~/hooks/useApi";
import type { OccurrenceAvailability } from "~/lib/api";

type PauseOption = "all" | "from" | "date";

export interface PauseExperienceModalProps {
  open: boolean;
  event: {
    id: string;
    title: string;
    is_recurring: boolean;
  };
  hostId: string;
  onClose: () => void;
  /**
   * Called when the host clicks Pause Now. The caller is responsible for
   * invoking the pause API and refreshing caches.
   */
  onConfirm: (options: { pausedFrom?: string; pausedDate?: string }) => void;
}

/**
 * Reusable pause-experience modal. Lets the host choose how to pause an
 * experience: entire series, from a specific session onwards, or a single
 * occurrence. Same UX as the experiences list page; shared so the dashboard
 * triple-dot menu can open the exact same flow.
 */
export function PauseExperienceModal({
  open,
  event,
  hostId,
  onClose,
  onConfirm,
}: PauseExperienceModalProps) {
  const [option, setOption] = useState<PauseOption>("all");
  const [selectedDate, setSelectedDate] = useState<string>("");

  const { data: availability, isLoading: availLoading } =
    useEventOccurrencesForHost(open ? event.id : null, open ? hostId : null);

  if (!open) return null;

  const handleConfirm = () => {
    const options: { pausedFrom?: string; pausedDate?: string } = {};
    if (option === "from") options.pausedFrom = selectedDate;
    if (option === "date") options.pausedDate = selectedDate;
    onConfirm(options);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
          <FiPause className="text-amber-600" size={24} />
        </div>
        <h2 className="mb-2 text-xl font-bold text-gray-900">
          Pause {event.title}?
        </h2>
        <p className="mb-6 text-sm text-gray-500">
          Select how you would like to pause this experience.
        </p>

        <div className="mb-6 space-y-3">
          {/* Pause All */}
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-100 p-3 transition hover:bg-gray-50">
            <input
              type="radio"
              name="pause-type"
              checked={option === "all"}
              onChange={() => setOption("all")}
              className="mt-1 h-4 w-4 text-[#0094CA]"
            />
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Pause entirely
              </p>
              <p className="text-xs text-gray-400">
                Hide the entire experience series.
              </p>
            </div>
          </label>

          {/* Pause From Session */}
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-100 p-3 transition hover:bg-gray-50">
            <input
              type="radio"
              name="pause-type"
              checked={option === "from"}
              onChange={() => setOption("from")}
              className="mt-1 h-4 w-4 text-[#0094CA]"
            />
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">
                Pause from a specific session onwards
              </p>
              <p className="text-xs text-gray-400">
                Keep current sessions, but pause this session and all after it.
              </p>
              {option === "from" && (
                <div className="mt-2 max-h-32 overflow-y-auto rounded-lg border border-gray-100">
                  {availLoading ? (
                    <div className="p-3 text-center text-xs text-gray-400">
                      Loading sessions...
                    </div>
                  ) : (
                    availability?.map((a: OccurrenceAvailability) => (
                      <div
                        key={a.date}
                        onClick={() =>
                          !a.is_paused && setSelectedDate(a.date)
                        }
                        className={`p-2 text-xs transition ${
                          a.is_paused
                            ? "cursor-not-allowed text-gray-400 line-through"
                            : selectedDate === a.date
                              ? "cursor-pointer bg-[#0094CA]/10 text-[#0094CA]"
                              : "cursor-pointer hover:bg-gray-50"
                        }`}
                      >
                        {new Date(a.date).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                        {a.is_paused && (
                          <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                            paused
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </label>

          {/* Pause Specific Date — recurring only */}
          {event.is_recurring && (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-100 p-3 transition hover:bg-gray-50">
              <input
                type="radio"
                name="pause-type"
                checked={option === "date"}
                onChange={() => setOption("date")}
                className="mt-1 h-4 w-4 text-[#0094CA]"
              />
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">
                  Pause specific session
                </p>
                <p className="text-xs text-gray-400">
                  Skip just one occurrence of this series.
                </p>
                {option === "date" && (
                  <div className="mt-2 max-h-32 overflow-y-auto rounded-lg border border-gray-100">
                    {availLoading ? (
                      <div className="p-3 text-center text-xs text-gray-400">
                        Loading sessions...
                      </div>
                    ) : (
                      availability?.map((a: OccurrenceAvailability) => (
                        <div
                          key={a.date}
                          onClick={() =>
                            !a.is_paused && setSelectedDate(a.date)
                          }
                          className={`p-2 text-xs transition ${
                            a.is_paused
                              ? "cursor-not-allowed text-gray-400 line-through"
                              : selectedDate === a.date
                                ? "cursor-pointer bg-[#0094CA]/10 text-[#0094CA]"
                                : "cursor-pointer hover:bg-gray-50"
                          }`}
                        >
                          {new Date(a.date).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                          {a.is_paused && (
                            <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                              paused
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </label>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg bg-gray-100 py-3 font-semibold text-gray-900 transition hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={
              (option === "from" || option === "date") && !selectedDate
            }
            className="flex-1 rounded-lg bg-amber-600 py-3 font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50"
          >
            Pause Now
          </button>
        </div>
      </div>
    </div>
  );
}
