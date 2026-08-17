"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "~/utils/firebase";
import { HostNavbar } from "~/components/host-dashboard";
import Breadcrumb from "~/components/Breadcrumb";
import { useHostJoinRequests, useReviewJoinRequest } from "~/hooks/useApi";
import { ATTENDEE_FIELDS } from "~/lib/attendeeFields";
import { formatIST } from "~/lib/datetime";
import type { JoinRequestDTO, JoinRequestStatus } from "~/lib/api";
import { FiCheck, FiX, FiExternalLink, FiInbox } from "react-icons/fi";
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
              ? `${req.user_name ?? "Guest"} can now book`
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
      <HostNavbar />
      <main className="min-h-screen bg-gray-50 pb-16">
        <div className="site-x mx-auto max-w-4xl pt-6">
          <Breadcrumb
            items={[
              { label: "Dashboard", href: "/host-dashboard" },
              { label: "Join requests" },
            ]}
            className="mb-6"
          />

          <header className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Join requests</h1>
            <p className="mt-1 text-sm text-gray-500">
              Guests asking to join your request-only experiences. Approving
              lets them book — it doesn&apos;t hold a spot or take payment.
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
                    ? "bg-[#0094CA] text-white"
                    : "border border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <LuLoader2 className="h-6 w-6 animate-spin text-[#0094CA]" />
            </div>
          ) : !requests || requests.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center">
              <FiInbox className="mx-auto mb-3 h-8 w-8 text-gray-300" />
              <p className="text-sm font-medium text-gray-700">
                {tab === "pending"
                  ? "No requests waiting on you"
                  : "Nothing here yet"}
              </p>
              <p className="mt-1 text-sm text-gray-500">
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
                    className="rounded-2xl border border-gray-200 bg-white p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900">
                          {req.user_name ?? "Guest"}
                        </p>
                        <p className="truncate text-sm text-gray-500">
                          {req.user_email}
                          {req.user_phone ? ` · ${req.user_phone}` : ""}
                        </p>
                        {req.event_slug && (
                          <Link
                            href={`/experience/${req.event_slug}`}
                            className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-[#0094CA] hover:underline"
                          >
                            {req.event_title}
                            <FiExternalLink size={12} />
                          </Link>
                        )}
                      </div>
                      <div className="text-right">
                        <StatusPill status={req.status} />
                        <p className="mt-1 text-xs text-gray-400">
                          {formatIST(req.created_at, "d MMM, h:mm a")}
                        </p>
                      </div>
                    </div>

                    {answers.length > 0 && (
                      <dl className="mt-4 grid gap-x-6 gap-y-2 border-t border-gray-100 pt-4 sm:grid-cols-2">
                        {answers.map(([key, value]) => (
                          <div key={key} className="min-w-0">
                            <dt className="text-xs text-gray-400">
                              {fieldLabel(key)}
                            </dt>
                            <dd className="truncate text-sm text-gray-800">
                              {key === "govt_id_url" && value ? (
                                <a
                                  href={answerText(value)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[#0094CA] hover:underline"
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
                      <p className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700 italic">
                        &ldquo;{req.message}&rdquo;
                      </p>
                    )}

                    {req.status === "pending" ? (
                      <div className="mt-4 flex gap-3">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => decide(req, true)}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1fa7ff] to-[#0094CA] py-2.5 text-sm font-bold text-white transition hover:shadow-md disabled:opacity-50 sm:flex-none sm:px-6"
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
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 sm:flex-none sm:px-6"
                        >
                          <FiX size={16} />
                          Decline
                        </button>
                      </div>
                    ) : (
                      req.reviewed_at && (
                        <p className="mt-4 text-xs text-gray-400">
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
      ? "bg-green-50 text-green-700 border-green-200"
      : status === "pending"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-gray-100 text-gray-500 border-gray-200";
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
