"use client";

import { HostSegments } from "~/components/host-dashboard";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import { useIdToken } from "~/hooks/useIdToken";
import {
  useHostJoinRequests,
  useHostPendingJoinRequestCount,
  useReviewJoinRequest,
} from "~/hooks/useApi";
import { ATTENDEE_FIELDS } from "~/lib/attendeeFields";
import { formatIST } from "~/lib/datetime";
import type { JoinRequestDTO, JoinRequestStatus } from "~/lib/api";
import {
  FiCheck,
  FiX,
  FiExternalLink,
  FiInbox,
  FiCalendar,
  FiChevronDown,
} from "react-icons/fi";
import { LuLoader2 } from "react-icons/lu";
import { toast } from "sonner";

const TABS: { key: JoinRequestStatus; label: string }[] = [
  { key: "pending", label: "Waiting" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Declined" },
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

const ago = (iso: string) =>
  formatDistanceToNowStrict(new Date(iso), { addSuffix: true });

/**
 * Join requests for request-only (RSVP) events. Requests are grouped by the
 * session they're for, since approval covers that one date. Approving lets
 * the guest book; once they book they're in the event's group chat.
 */
export default function HostJoinRequestsPage() {
  const idToken = useIdToken();
  const [tab, setTab] = useState<JoinRequestStatus>("pending");
  const [eventFilter, setEventFilter] = useState<string>("all");
  const { data: requests, isLoading } = useHostJoinRequests(idToken, tab);
  const { data: pendingCount = 0 } = useHostPendingJoinRequestCount(idToken);
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
              ? `${req.user_name ?? "Guest"} can now book this session`
              : "Request declined",
          ),
        onError: (err: Error) =>
          toast.error(err.message || "Could not save that decision"),
        onSettled: () => setBusyId(null),
      },
    );
  };

  // Events that have requests in this tab, for the filter chips.
  const eventsInTab = useMemo(() => {
    const m = new Map<string, { title: string; n: number }>();
    for (const r of requests ?? []) {
      const cur = m.get(r.event_id);
      m.set(r.event_id, {
        title: r.event_title ?? "Event",
        n: (cur?.n ?? 0) + 1,
      });
    }
    return [...m.entries()];
  }, [requests]);

  useEffect(() => {
    if (
      eventFilter !== "all" &&
      !eventsInTab.some(([id]) => id === eventFilter)
    )
      setEventFilter("all");
  }, [eventsInTab, eventFilter]);

  // One group per event + date, soonest session first.
  const groups = useMemo(() => {
    const m = new Map<string, JoinRequestDTO[]>();
    for (const r of requests ?? []) {
      if (eventFilter !== "all" && r.event_id !== eventFilter) continue;
      const k = `${r.event_id}|${r.occurrence_date}`;
      m.set(k, [...(m.get(k) ?? []), r]);
    }
    return [...m.values()].sort(
      (a, b) =>
        new Date(a[0]!.occurrence_date).getTime() -
        new Date(b[0]!.occurrence_date).getTime(),
    );
  }, [requests, eventFilter]);

  return (
    <main className="min-h-screen bg-[#080914] pb-16">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 md:py-8">
        <HostSegments
          items={[
            { label: "Messages", href: "/host-dashboard/messages" },
            { label: "Requests", href: "/host-dashboard/requests" },
          ]}
        />
        <header className="mb-5">
          <h1 className="font-outfit text-[26px] leading-tight font-semibold tracking-[-0.01em] text-white sm:text-[32px]">
            Requests
          </h1>
          <p className="mt-1 text-sm text-[#A5A8C3]">
            Guests asking to join your request-only events. Approving lets them
            book that date; once they book, they join the event&apos;s group.
          </p>
        </header>

        <div className="flex rounded-full border border-white/10 bg-[#121426] p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-sm font-medium transition ${
                tab === t.key
                  ? "bg-[#A020F0] text-white"
                  : "text-[#A5A8C3] hover:text-white"
              }`}
            >
              {t.label}
              {t.key === "pending" && pendingCount > 0 && (
                <span
                  className={`rounded-full px-1.5 text-[11px] font-bold ${tab === t.key ? "bg-white/25" : "bg-[#A020F0] text-white"}`}
                >
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {eventsInTab.length > 1 && (
          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            {[
              [
                "all",
                { title: "All events", n: requests?.length ?? 0 },
              ] as const,
              ...eventsInTab,
            ].map(([id, { title, n }]) => (
              <button
                key={id}
                type="button"
                onClick={() => setEventFilter(id)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition ${
                  eventFilter === id
                    ? "border-[#A020F0] bg-[#A020F0]/15 text-white"
                    : "border-white/10 text-[#A5A8C3] hover:text-white"
                }`}
              >
                {title} <span className="opacity-60">{n}</span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-4">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <LuLoader2 className="h-6 w-6 animate-spin text-[#D8B4FE]" />
            </div>
          ) : groups.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#121426] px-6 py-14 text-center">
              <FiInbox className="mx-auto mb-3 h-7 w-7 text-white/30" />
              <p className="text-sm font-medium text-white/80">
                {tab === "pending"
                  ? "You're all caught up"
                  : tab === "approved"
                    ? "No approved requests yet"
                    : "No declined requests"}
              </p>
              <p className="mx-auto mt-1 max-w-sm text-xs text-[#777B98]">
                Requests come in when a guest applies to an event set to
                &ldquo;Request to join&rdquo;.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map((list) => {
                const first = list[0]!;
                return (
                  <section
                    key={`${first.event_id}|${first.occurrence_date}`}
                    className="overflow-hidden rounded-2xl border border-white/10 bg-[#121426]"
                  >
                    <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">
                          {first.event_title ?? "Event"}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[#A5A8C3]">
                          <FiCalendar className="h-3 w-3" aria-hidden />
                          {formatIST(
                            first.occurrence_date,
                            "EEE d MMM, h:mm a",
                          )}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-[#A5A8C3]">
                        {list.length}
                      </span>
                      {first.event_slug && (
                        <Link
                          href={`/experience/${first.event_slug}`}
                          aria-label="Open event page"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#A5A8C3] hover:bg-white/[0.06]"
                        >
                          <FiExternalLink className="h-4 w-4" />
                        </Link>
                      )}
                    </div>
                    <ul className="divide-y divide-white/[0.06]">
                      {list.map((req) => (
                        <RequestRow
                          key={req.id}
                          req={req}
                          busy={busyId === req.id}
                          onDecide={(approve) => decide(req, approve)}
                        />
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function RequestRow({
  req,
  busy,
  onDecide,
}: {
  req: JoinRequestDTO;
  busy: boolean;
  onDecide: (approve: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const answers = Object.entries(req.answers_snapshot ?? {}).filter(
    ([, v]) => v !== null && v !== undefined && v !== "",
  );
  const name = req.user_name ?? "Guest";
  const pending = req.status === "pending";

  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        {req.user_avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={req.user_avatar_url}
            alt=""
            className="h-9 w-9 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#A020F0]/15 text-sm font-semibold text-[#D8B4FE]">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{name}</p>
          <p className="truncate text-xs text-[#777B98]">
            {pending
              ? `Asked ${ago(req.created_at)}`
              : `${req.status === "approved" ? "Approved" : req.status === "rejected" ? "Declined" : "Withdrawn"} ${req.reviewed_at ? ago(req.reviewed_at) : ""}${req.reviewed_by_kind === "admin" ? " by support" : ""}`}
            {req.user_phone ? ` · ${req.user_phone}` : ""}
          </p>
        </div>
        {pending && (
          <div className="flex w-full gap-2 sm:w-auto">
            <button
              type="button"
              disabled={busy}
              onClick={() => onDecide(false)}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/[0.06] disabled:opacity-50 sm:flex-none"
            >
              <FiX className="h-3.5 w-3.5" />
              Decline
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onDecide(true)}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#A020F0] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#8A1AD0] disabled:opacity-50 sm:flex-none"
            >
              {busy ? (
                <LuLoader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FiCheck className="h-3.5 w-3.5" />
              )}
              Approve
            </button>
          </div>
        )}
      </div>

      {req.message && (
        <p className="mt-2 ml-12 line-clamp-3 rounded-xl bg-white/[0.04] px-3 py-2 text-sm text-white/80">
          &ldquo;{req.message}&rdquo;
        </p>
      )}

      {answers.length > 0 && (
        <div className="mt-2 ml-12">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#D8B4FE] hover:underline"
          >
            {open ? "Hide" : "View"} their answers ({answers.length})
            <FiChevronDown
              className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`}
            />
          </button>
          {open && (
            <dl className="mt-2 grid gap-x-6 gap-y-2 rounded-xl bg-white/[0.03] p-3 sm:grid-cols-2">
              {req.user_email && (
                <div className="min-w-0">
                  <dt className="text-xs text-[#777B98]">Email</dt>
                  <dd className="truncate text-sm text-white">
                    {req.user_email}
                  </dd>
                </div>
              )}
              {answers.map(([key, value]) => (
                <div key={key} className="min-w-0">
                  <dt className="text-xs text-[#777B98]">{fieldLabel(key)}</dt>
                  <dd className="truncate text-sm text-white">
                    {key === "govt_id_url" ? (
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
        </div>
      )}
    </li>
  );
}
