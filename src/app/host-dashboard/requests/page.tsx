"use client";

import { HostSegments } from "~/components/host-dashboard";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "~/utils/firebase";
import { useHostJoinRequests, useReviewJoinRequest } from "~/hooks/useApi";
import { ATTENDEE_FIELDS } from "~/lib/attendeeFields";
import { formatIST } from "~/lib/datetime";
import type { JoinRequestDTO, JoinRequestStatus } from "~/lib/api";
import {
  FiCheck,
  FiX,
  FiExternalLink,
  FiInbox,
  FiCalendar,
} from "react-icons/fi";
import { LuLoader2 } from "react-icons/lu";
import { toast } from "sonner";

/**
 * Join requests queue — guests asking to join the host's RSVP-gated private
 * experiences.
 *
 * Approving UNLOCKS booking for that guest; it does not book or charge
 * anything. The guest is emailed and has to come back and book, so a seat is
 * only really taken once they do.
 */

const TABS: { key: JoinRequestStatus | "all"; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Declined" },
  { key: "all", label: "All" },
];

const fieldLabel = (key: string) =>
  ATTENDEE_FIELDS.find((f) => f.key === key)?.label ?? key;

// Snapshot values are whatever JSON the guest submitted, so narrow before
// rendering rather than stringifying blindly.
const answerText = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return JSON.stringify(value);
};

export default function HostJoinRequestsPage() {
  const [authUser] = useAuthState(auth);
  const [idToken, setIdToken] = useState<string | null>(null);
  useEffect(() => {
    if (authUser) {
      void authUser.getIdToken().then(setIdToken);
    } else {
      setIdToken(localStorage.getItem("msm_auth_token"));
    }
  }, [authUser]);

  const [tab, setTab] = useState<JoinRequestStatus | "all">("pending");
  const { data: requests, isLoading } = useHostJoinRequests(
    idToken,
    tab === "all" ? undefined : tab,
  );
  const review = useReviewJoinRequest(idToken);

  // Track which row is mid-decision so only that row's buttons spin.
  const [busyId, setBusyId] = useState<string | null>(null);

  const decide = (req: JoinRequestDTO, approve: boolean) => {
    setBusyId(req.id);
    review.mutate(
      { requestId: req.id, approve },
      {
        onSuccess: () =>
          toast.success(
            approve
              ? `${req.user_name ?? "Guest"} can now book that session`
              : "Request declined",
          ),
        onError: (err: Error) =>
          toast.error(err.message || "Could not save that decision"),
        onSettled: () => setBusyId(null),
      },
    );
  };

  return (
    <>
      <main className="min-h-screen bg-[#080914] pb-16">
        <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 md:py-10">
          <HostSegments
            items={[
              { label: "Messages", href: "/host-dashboard/messages" },
              { label: "Requests", href: "/host-dashboard/requests" },
            ]}
          />
          <header className="mb-6">
            <h1 className="font-outfit text-[26px] leading-tight font-semibold tracking-[-0.01em] text-white sm:text-[32px]">
              Join requests
            </h1>
            <p className="mt-1 text-sm text-[#A5A8C3]">
              Guests asking to join your request-only experiences. Each request
              is for one session — approving lets them book that date only, and
              doesn&apos;t hold a slot or take payment.
            </p>
          </header>

          <div className="mb-5 flex gap-2 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  tab === t.key
                    ? "bg-[#A020F0] text-white"
                    : "border border-white/10 bg-[#121426] text-[#A5A8C3] hover:border-white/15"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <LuLoader2 className="h-6 w-6 animate-spin text-[#D8B4FE]" />
            </div>
          ) : !requests || requests.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#121426] px-6 py-16 text-center">
              <FiInbox className="mx-auto mb-3 h-8 w-8 text-white/30" />
              <p className="text-sm font-medium text-white/80">
                {tab === "pending"
                  ? "No requests waiting on you"
                  : "Nothing here yet"}
              </p>
              <p className="mt-1 text-sm text-[#A5A8C3]">
                Requests appear when a guest applies to a private experience set
                to &ldquo;Request to join&rdquo;.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {requests.map((req) => {
                const answers = Object.entries(req.answers_snapshot ?? {});
                const isBusy = busyId === req.id;
                return (
                  <li
                    key={req.id}
                    className="rounded-2xl border border-white/10 bg-[#121426] p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-white">
                          {req.user_name ?? "Guest"}
                        </p>
                        <p className="truncate text-sm text-[#A5A8C3]">
                          {req.user_email}
                          {req.user_phone ? ` · ${req.user_phone}` : ""}
                        </p>
                        {req.event_slug && (
                          <Link
                            href={`/experience/${req.event_slug}`}
                            className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-[#D8B4FE] hover:underline"
                          >
                            {req.event_title}
                            <FiExternalLink size={12} />
                          </Link>
                        )}
                        {/* The session being asked about. Approval covers this
                            date only, so it has to be on the card the host
                            decides from. */}
                        {req.occurrence_date && (
                          <p className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-[#A020F0]/10 px-2 py-1 text-xs font-semibold text-white">
                            <FiCalendar size={12} className="text-[#D8B4FE]" />
                            {formatIST(
                              req.occurrence_date,
                              "eee d MMM, h:mm a",
                            )}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <StatusPill status={req.status} />
                        <p className="mt-1 text-xs text-[#777B98]">
                          {formatIST(req.created_at, "d MMM, h:mm a")}
                        </p>
                      </div>
                    </div>

                    {answers.length > 0 && (
                      <dl className="mt-4 grid gap-x-6 gap-y-2 border-t border-white/10 pt-4 sm:grid-cols-2">
                        {answers.map(([key, value]) => (
                          <div key={key} className="min-w-0">
                            <dt className="text-xs text-[#777B98]">
                              {fieldLabel(key)}
                            </dt>
                            <dd className="truncate text-sm text-white">
                              {key === "govt_id_url" && value ? (
                                <a
                                  href={answerText(value)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[#D8B4FE] hover:underline"
                                >
                                  View ID
                                </a>
                              ) : (
                                answerText(value)
                              )}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    )}

                    {req.message && (
                      <p className="mt-4 rounded-lg bg-white/[0.04] px-3 py-2 text-sm text-white/80 italic">
                        &ldquo;{req.message}&rdquo;
                      </p>
                    )}

                    {req.status === "pending" ? (
                      <div className="mt-4 flex gap-3">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => decide(req, true)}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#A020F0] to-[#A020F0] py-2.5 text-sm font-bold text-white transition hover:shadow-md disabled:opacity-50 sm:flex-none sm:px-6"
                        >
                          {isBusy ? (
                            <LuLoader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <FiCheck size={16} />
                          )}
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => decide(req, false)}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/[0.04] disabled:opacity-50 sm:flex-none sm:px-6"
                        >
                          <FiX size={16} />
                          Decline
                        </button>
                      </div>
                    ) : (
                      req.reviewed_at && (
                        <p className="mt-4 text-xs text-[#777B98]">
                          Decided {formatIST(req.reviewed_at, "d MMM, h:mm a")}
                          {req.reviewed_by_kind === "admin" &&
                            " by MySlotMate support"}
                        </p>
                      )
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}

function StatusPill({ status }: { status: JoinRequestStatus }) {
  const style =
    status === "approved"
      ? "bg-green-500/10 text-green-300 border-green-500/30"
      : status === "pending"
        ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
        : "bg-white/[0.06] text-[#A5A8C3] border-white/10";
  const label =
    status === "approved"
      ? "Approved"
      : status === "pending"
        ? "Pending"
        : status === "rejected"
          ? "Declined"
          : "Withdrawn";
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${style}`}
    >
      {label}
    </span>
  );
}
