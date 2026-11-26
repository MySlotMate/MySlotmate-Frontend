"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import * as api from "~/lib/api";

import {
  useBookingsByUser,
  useHostAttentionItems,
  useHostPendingJoinRequestCount,
  useListPublicEvents,
  useUserTickets,
  useWalletTransactions,
  queryKeys,
} from "~/hooks/useApi";
import { useIdToken } from "~/hooks/useIdToken";
import { useStoredAuth } from "~/hooks/useStoredAuth";
import { formatIST } from "~/lib/datetime";
import type { EventDTO } from "~/lib/api";

/**
 * There is no notifications endpoint yet, so the feed is assembled on the
 * client from what the API already returns: the user's bookings, wallet
 * history and support tickets, plus host alerts for hosts. "Read" is a
 * per-device timestamp in localStorage.
 */

export type NotificationKind =
  | "booking"
  | "reminder"
  | "payment"
  | "host"
  | "support";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  /** ISO time the thing happened; drives ordering and "unread". */
  at: string;
  href: string;
  image?: string | null;
  /** Reminders stay on top while they're still ahead. */
  pinned?: boolean;
}

const SEEN_KEY = "msm_notifications_seen_at";
const SEEN_EVENT = "msm-notifications-seen";

const rupees = (cents: number) =>
  `₹${(Math.abs(cents) / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const FIRST_SEEN_KEY = "msm_notifications_first_seen";

/**
 * When this device first saw a live count (e.g. "1 cancelled booking"). Those
 * come from the API with no timestamp; dating them to today's midnight made the
 * same old count reappear as new every day. The id carries the count, so a new
 * cancellation (count changes) is a new notification, dated when first seen.
 */
function firstSeenAt(id: string): string {
  const now = new Date().toISOString();
  try {
    const map = JSON.parse(
      localStorage.getItem(FIRST_SEEN_KEY) ?? "{}",
    ) as Record<string, string>;
    if (map[id]) return map[id];
    map[id] = now;
    localStorage.setItem(FIRST_SEEN_KEY, JSON.stringify(map));
  } catch {
    /* private mode: falls back to "now", same as before for this session */
  }
  return now;
}

function readSeen(): number {
  try {
    return Number(localStorage.getItem(SEEN_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function useNotifications() {
  const { userId, hostId } = useStoredAuth();
  const uid = userId && userId !== "existing" ? userId : null;
  const idToken = useIdToken();

  const { data: bookings, isLoading } = useBookingsByUser(uid);
  const { data: payments } = useWalletTransactions(uid, 30);
  const { data: tickets } = useUserTickets(uid);
  const { data: events } = useListPublicEvents();
  const { data: attention } = useHostAttentionItems(hostId);
  const { data: pendingJoins } = useHostPendingJoinRequestCount(
    hostId ? idToken : null,
  );
  // Co-host invitations waiting for this host's answer. The same request that
  // fills the dashboard's shared-experiences card; it also attaches invites
  // sent to this email before they became a host.
  const { data: shared } = useQuery({
    queryKey: ["cohost-shared", idToken ? "me" : null],
    queryFn: () => api.listSharedEvents(idToken!),
    enabled: Boolean(hostId && idToken),
    staleTime: 60 * 1000,
    select: (res) => res.data ?? [],
  });

  // Past events drop out of the public list; fetch the ones bookings point at.
  const missingIds = useMemo(() => {
    const known = new Set((events ?? []).map((e) => e.id));
    return [
      ...new Set(
        (bookings ?? []).map((b) => b.event_id).filter((id) => !known.has(id)),
      ),
    ].slice(0, 20);
  }, [bookings, events]);
  const extra = useQueries({
    queries: missingIds.map((id) => ({
      queryKey: queryKeys.event(id),
      queryFn: () => api.getEvent(id),
      staleTime: 10 * 60 * 1000,
      select: (res: api.Envelope<EventDTO>) => res.data,
    })),
  });
  const extraEvents = extra.map((q) => q.data).filter(Boolean) as EventDTO[];
  const extraKey = extraEvents.map((e) => e.id).join(",");

  const [seenAt, setSeenAt] = useState(0);
  useEffect(() => {
    setSeenAt(readSeen());
    const sync = () => setSeenAt(readSeen());
    window.addEventListener(SEEN_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SEEN_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const items = useMemo<AppNotification[]>(() => {
    const byId = new Map<string, EventDTO>(
      [...(events ?? []), ...extraEvents].map((e) => [e.id, e]),
    );
    const out: AppNotification[] = [];
    const now = Date.now();

    for (const b of bookings ?? []) {
      const ev = byId.get(b.event_id);
      const name = ev?.title ?? "your experience";
      const when = new Date(b.occurrence_date);
      const ticketHref = ev
        ? `/experience/${ev.slug}/confirmation?booking=${b.id}`
        : "/activities";
      const image = ev?.cover_image_url ?? null;
      const seats = b.quantity > 1 ? ` · ${b.quantity} tickets` : "";

      if (b.status === "confirmed") {
        out.push({
          id: `booked-${b.id}`,
          kind: "booking",
          title: "Booking confirmed",
          body: `You're going to ${name} on ${formatIST(when, "EEE, d MMM 'at' h:mm a")}${seats}.`,
          at: b.created_at,
          href: ticketHref,
          image,
        });
        const until = when.getTime() - now;
        if (until > 0 && until < 48 * 3600 * 1000) {
          const today =
            formatIST(when, "yyyy-MM-dd") ===
            formatIST(new Date(), "yyyy-MM-dd");
          out.push({
            id: `soon-${b.id}`,
            kind: "reminder",
            title: today ? "Today's plan" : "Tomorrow's plan",
            body: `${name} starts at ${formatIST(when, "h:mm a")}. Keep your ticket handy.`,
            // Surfaces as new once the reminder window opens.
            at: new Date(
              Math.max(
                when.getTime() - 48 * 3600 * 1000,
                Date.parse(b.created_at),
              ),
            ).toISOString(),
            href: ticketHref,
            image,
            pinned: true,
          });
        }
        const after = now - when.getTime();
        if (after > 3 * 3600 * 1000 && after < 14 * 24 * 3600 * 1000 && ev) {
          out.push({
            id: `review-${b.id}`,
            kind: "booking",
            title: "How was it?",
            body: `Rate ${name} and help others find great experiences.`,
            at: new Date(when.getTime() + 3 * 3600 * 1000).toISOString(),
            href: `/experience/${ev.slug}#reviews`,
            image,
          });
        }
      } else if (b.status === "cancelled" || b.status === "refunded") {
        out.push({
          id: `cancel-${b.id}`,
          kind: "booking",
          title:
            b.status === "refunded" ? "Booking refunded" : "Booking cancelled",
          body: `Your booking for ${name} was ${b.status}.`,
          at: b.cancelled_at ?? b.updated_at,
          href: "/activities",
          image,
        });
      }
    }

    for (const p of payments ?? []) {
      if (p.status !== "completed" && p.status !== "failed") continue;
      if (p.type === "booking") continue; // covered by the booking itself
      const failed = p.status === "failed";
      const label =
        p.type === "topup"
          ? failed
            ? "Wallet top-up failed"
            : "Money added to wallet"
          : p.type === "refund"
            ? "Refund received"
            : p.type === "withdrawal" || p.type === "payout"
              ? failed
                ? "Withdrawal failed"
                : "Withdrawal sent"
              : "Wallet update";
      out.push({
        id: `pay-${p.id}`,
        kind: "payment",
        title: label,
        body: failed
          ? `${rupees(p.amount_cents)} didn't go through. Please try again.`
          : `${rupees(p.amount_cents)}${p.type === "refund" ? " is back in your wallet." : p.type === "topup" ? " added to your MySlotMate wallet." : " is on its way to your bank."}`,
        at: p.updated_at ?? p.created_at,
        href: "/wallet",
      });
    }

    for (const t of tickets ?? []) {
      const last = t.messages[t.messages.length - 1];
      const fromSupport =
        last && last.sender !== t.user_id && last.sender !== "user";
      if (t.status === "resolved" || t.status === "closed") {
        out.push({
          id: `ticket-${t.id}-${t.status}`,
          kind: "support",
          title: "Support request resolved",
          body: t.subject,
          at: t.updated_at,
          href: "/support",
        });
      } else if (fromSupport) {
        out.push({
          id: `ticket-${t.id}-${last.created_at}`,
          kind: "support",
          title: "New reply from support",
          body: last.text,
          at: last.created_at,
          href: "/support",
        });
      }
    }

    if (hostId) {
      // Live counts with no timestamp: dated to when this device first saw
      // that exact count (see firstSeenAt).
      for (const a of attention ?? []) {
        const id = `host-${a.type}-${a.count}`;
        out.push({
          id,
          kind: "host",
          title:
            a.type === "unread_message"
              ? "Guests are messaging you"
              : a.type === "cancelled_booking"
                ? "A guest cancelled"
                : a.type === "pending_review"
                  ? "Reviews on the way"
                  : a.type === "low_rating"
                    ? "Your rating dipped"
                    : "Hosting update",
          body: a.message,
          at: firstSeenAt(id),
          href:
            a.type === "unread_message"
              ? "/host-dashboard/messages"
              : a.type === "cancelled_booking"
                ? "/host-dashboard/bookings"
                : "/host-dashboard",
        });
      }
      for (const sh of shared ?? []) {
        if (sh.status !== "pending") continue;
        out.push({
          id: `cohost-invite-${sh.cohost_id}`,
          kind: "host",
          title: "Co-host invitation",
          body: `${sh.owner_name || "A host"} invited you to co-host ${sh.event_title}. Accept or decline it.`,
          at: sh.invited_at,
          href: "/host-dashboard/co-hosting",
        });
      }
      if (pendingJoins && pendingJoins > 0) {
        out.push({
          id: `joins-${pendingJoins}`,
          kind: "host",
          title: "Join requests waiting",
          body: `${pendingJoins} guest${pendingJoins === 1 ? " wants" : "s want"} to join a private experience.`,
          at: firstSeenAt(`joins-${pendingJoins}`),
          href: "/host-dashboard/requests",
        });
      }
    }

    return out.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return Date.parse(b.at) - Date.parse(a.at);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- extraKey stands in for extraEvents
  }, [
    bookings,
    payments,
    tickets,
    events,
    extraKey,
    attention,
    pendingJoins,
    shared,
    hostId,
  ]);

  const isUnread = useCallback(
    (n: AppNotification) => Date.parse(n.at) > seenAt,
    [seenAt],
  );
  const unreadCount = items.filter(isUnread).length;

  const markAllRead = useCallback(() => {
    const t = Date.now();
    try {
      localStorage.setItem(SEEN_KEY, String(t));
    } catch {
      /* private mode: unread state just won't persist */
    }
    setSeenAt(t);
    window.dispatchEvent(new Event(SEEN_EVENT));
  }, []);

  return {
    items,
    unreadCount,
    isUnread,
    markAllRead,
    isLoading: isLoading && Boolean(uid),
    signedIn: Boolean(uid),
  };
}
