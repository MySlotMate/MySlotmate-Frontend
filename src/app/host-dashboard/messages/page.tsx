"use client";

import { HostSegments } from "~/components/host-dashboard";
import { useStoredAuth } from "~/hooks/useStoredAuth";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  useEventAttendees,
  useEventMessages,
  useEventsByHost,
  useHostMessages,
  useMarkMessageRead,
  useSendMessage,
} from "~/hooks/useApi";
import { useContentModeration } from "~/hooks/useContentModeration";
import { createSocket } from "~/lib/socket";
import type { BookingDTO, EventDTO, InboxMessageDTO } from "~/lib/api";
import {
  FiArrowLeft,
  FiExternalLink,
  FiSearch,
  FiSend,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { format, isToday, isYesterday } from "date-fns";
import { formatIST } from "~/lib/datetime";
import EventCover from "~/components/EventCover";

/** A guest's colour, stable per person, so a busy group stays readable. */
const NAME_COLOURS = [
  "text-[#F9A8D4]",
  "text-[#93C5FD]",
  "text-[#6EE7B7]",
  "text-[#FCD34D]",
  "text-[#FDBA74]",
  "text-[#C4B5FD]",
];
const colourFor = (id: string) => {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return NAME_COLOURS[h % NAME_COLOURS.length]!;
};

const dayLabel = (d: Date) =>
  isToday(d) ? "Today" : isYesterday(d) ? "Yesterday" : format(d, "EEE, d MMM");

const shortTime = (iso: string) => {
  const d = new Date(iso);
  return isToday(d)
    ? format(d, "h:mm a")
    : isYesterday(d)
      ? "Yesterday"
      : format(d, "d MMM");
};

interface Member {
  userId: string;
  name: string;
  avatar: string | null;
  tickets: number;
}

/** Everyone who booked is in the event's group. */
function membersOf(bookings: BookingDTO[] | undefined): Member[] {
  const byUser = new Map<string, Member>();
  for (const b of bookings ?? []) {
    if (b.status !== "confirmed" && b.status !== "pending") continue;
    const cur = byUser.get(b.user_id);
    byUser.set(b.user_id, {
      userId: b.user_id,
      name: b.user_name ?? cur?.name ?? "Guest",
      avatar: b.user_avatar_url ?? cur?.avatar ?? null,
      tickets: (cur?.tickets ?? 0) + b.quantity,
    });
  }
  return [...byUser.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Host inbox. Every published event has a group chat; guests join it when
 * they book. The left column lists the groups (latest activity first), the
 * right column is the open chat. On a phone they're two screens.
 */
export default function HostMessagesPage() {
  const qc = useQueryClient();
  const { hostId } = useStoredAuth();

  const { data: allEvents, isLoading: loadingEvents } = useEventsByHost(hostId);
  const { data: hostMessages } = useHostMessages(hostId);

  // Drafts have no guests yet, so they have no group.
  const events = useMemo(
    () => (allEvents ?? []).filter((e) => e.status !== "draft"),
    [allEvents],
  );

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  /** Phone only: true while the chat screen is showing. */
  const [chatOpen, setChatOpen] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  useEffect(() => {
    // Avoid `useSearchParams()` to keep this page build-friendly without Suspense.
    const fromUrl = new URLSearchParams(window.location.search).get("event");
    if (fromUrl) {
      setSelectedEventId(fromUrl);
      setChatOpen(true);
    }
  }, []);

  const summaries = useMemo(() => {
    const map = new Map<
      string,
      { last: InboxMessageDTO | null; unread: number; lastAtMs: number }
    >();
    for (const m of hostMessages ?? []) {
      const cur = map.get(m.event_id) ?? { last: null, unread: 0, lastAtMs: 0 };
      const at = new Date(m.created_at).getTime();
      map.set(m.event_id, {
        last: !cur.last || at >= cur.lastAtMs ? m : cur.last,
        // The host's own messages never count as unread.
        unread: cur.unread + (m.is_read || m.sender_type === "host" ? 0 : 1),
        lastAtMs: Math.max(cur.lastAtMs, at),
      });
    }
    return map;
  }, [hostMessages]);

  const [search, setSearch] = useState("");
  const threads = useMemo(() => {
    const list = [...events].sort(
      (a, b) =>
        (summaries.get(b.id)?.lastAtMs ?? new Date(b.created_at).getTime()) -
        (summaries.get(a.id)?.lastAtMs ?? new Date(a.created_at).getTime()),
    );
    const q = search.trim().toLowerCase();
    return q ? list.filter((e) => e.title.toLowerCase().includes(q)) : list;
  }, [events, search, summaries]);

  // Desktop: open the most recent group straight away.
  useEffect(() => {
    if (!selectedEventId && threads[0]) setSelectedEventId(threads[0].id);
  }, [threads, selectedEventId]);

  const selected = events.find((e) => e.id === selectedEventId) ?? null;

  /* Socket.IO: join the open group's room and refresh on updates. */
  useEffect(() => {
    if (!hostId || !selectedEventId) return;
    const socket = createSocket();
    const room = `event_${selectedEventId}`;
    const join = () => socket.emit("join_room", room);
    socket.on("connect", join);
    join();
    socket.on("inbox_update", (payload: unknown) => {
      void qc.invalidateQueries({ queryKey: ["hostMessages", hostId] });
      void qc.invalidateQueries({
        queryKey: ["eventMessages", selectedEventId],
      });
      const maybe = payload as { event_id?: string };
      if (maybe?.event_id)
        void qc.invalidateQueries({
          queryKey: ["eventMessages", maybe.event_id],
        });
    });
    return () => {
      socket.off("connect", join);
      socket.off("inbox_update");
      socket.disconnect();
    };
  }, [hostId, selectedEventId, qc]);

  const openThread = (id: string) => {
    setSelectedEventId(id);
    setChatOpen(true);
    setShowMembers(false);
  };

  if (!hostId) {
    return (
      <div className="min-h-screen bg-[#080914]">
        <main className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 md:py-10 lg:px-10">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            No host profile found. Please apply as a host first.
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080914]">
      <main className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 md:py-8 lg:px-10">
        <div className={chatOpen ? "hidden lg:block" : ""}>
          <HostSegments
            items={[
              { label: "Messages", href: "/host-dashboard/messages" },
              { label: "Requests", href: "/host-dashboard/requests" },
            ]}
          />
          <div className="mb-5">
            <h1 className="font-outfit text-[26px] leading-tight font-semibold tracking-[-0.01em] text-white sm:text-[32px]">
              Messages
            </h1>
            <p className="mt-1 text-sm text-[#A5A8C3]">
              Each event has its own group. Guests join it when they book.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
          {/* Groups */}
          <aside
            className={`rounded-2xl border border-white/10 bg-[#121426] ${chatOpen ? "hidden lg:block" : ""}`}
          >
            <div className="p-3">
              <div className="relative">
                <FiSearch className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#777B98]" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search groups"
                  className="w-full rounded-full border border-white/10 bg-white/[0.03] py-2 pr-4 pl-10 text-sm text-white placeholder-[#777B98] outline-none focus:border-[#A020F0]"
                />
              </div>
            </div>

            {loadingEvents ? (
              <div className="flex justify-center py-10">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-[#A020F0] border-t-transparent" />
              </div>
            ) : threads.length === 0 ? (
              <p className="px-4 pb-6 text-center text-sm text-[#777B98]">
                {search
                  ? "No group matches that."
                  : "Publish an event and its group appears here."}
              </p>
            ) : (
              <ul className="max-h-[68vh] overflow-y-auto pb-2">
                {threads.map((ev) => (
                  <ThreadRow
                    key={ev.id}
                    event={ev}
                    summary={summaries.get(ev.id)}
                    active={ev.id === selectedEventId}
                    onOpen={() => openThread(ev.id)}
                  />
                ))}
              </ul>
            )}
          </aside>

          {/* Open group */}
          <section className={chatOpen ? "" : "hidden lg:block"}>
            {selected ? (
              <ChatPanel
                key={selected.id}
                event={selected}
                hostId={hostId}
                showMembers={showMembers}
                onToggleMembers={() => setShowMembers((s) => !s)}
                onBack={() => setChatOpen(false)}
              />
            ) : (
              <div className="flex h-[68vh] items-center justify-center rounded-2xl border border-white/10 bg-[#121426] text-sm text-[#777B98]">
                Pick a group to open the chat.
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function ThreadRow({
  event,
  summary,
  active,
  onOpen,
}: {
  event: EventDTO;
  summary?: { last: InboxMessageDTO | null; unread: number };
  active: boolean;
  onOpen: () => void;
}) {
  const last = summary?.last;
  const preview = last
    ? `${last.sender_type === "host" ? "You: " : ""}${last.message}`
    : "No messages yet. Say hello!";
  const unread = summary?.unread ?? 0;

  return (
    <li>
      <button
        onClick={onOpen}
        className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition ${
          active ? "bg-[#A020F0]/15" : "hover:bg-white/[0.04]"
        }`}
      >
        <EventCover
          src={event.cover_image_url}
          seed={event.id}
          mood={event.mood}
          iconSize="sm"
          blurFill
          className="aspect-square w-11 shrink-0 rounded-xl"
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
              {event.title}
            </span>
            {last && (
              <span
                className={`shrink-0 text-[11px] ${unread ? "font-semibold text-[#D8B4FE]" : "text-[#777B98]"}`}
              >
                {shortTime(last.created_at)}
              </span>
            )}
          </span>
          <span className="mt-0.5 flex items-center gap-2">
            <span
              className={`min-w-0 flex-1 truncate text-xs ${unread ? "text-white" : "text-[#777B98]"}`}
            >
              {preview}
            </span>
            {unread > 0 && (
              <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#A020F0] px-1.5 text-[10px] font-bold text-white">
                {unread}
              </span>
            )}
          </span>
        </span>
      </button>
    </li>
  );
}

function ChatPanel({
  event,
  hostId,
  showMembers,
  onToggleMembers,
  onBack,
}: {
  event: EventDTO;
  hostId: string;
  showMembers: boolean;
  onToggleMembers: () => void;
  onBack: () => void;
}) {
  const { data: messages, isLoading } = useEventMessages(event.id);
  const { data: bookings } = useEventAttendees(event.id);
  const members = useMemo(() => membersOf(bookings), [bookings]);
  const memberById = useMemo(
    () => new Map(members.map((m) => [m.userId, m])),
    [members],
  );

  const sendMessage = useSendMessage();
  const markRead = useMarkMessageRead();
  const { checkContentSync } = useContentModeration();
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const markedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  // Opening the chat reads it.
  useEffect(() => {
    for (const m of messages ?? []) {
      if (m.is_read || m.sender_type === "host") continue;
      if (markedRef.current.has(m.id)) continue;
      markedRef.current.add(m.id);
      markRead.mutate(m.id);
    }
  }, [messages, markRead]);

  // Grow the box with the text, up to about five lines.
  useEffect(() => {
    const el = inputRef.current;
    // Hidden (phone list view) measures as 0: leave the CSS minimum alone.
    if (el?.offsetParent == null) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input]);

  const send = () => {
    const text = input.trim();
    if (!text || sendMessage.isPending) return;
    const result = checkContentSync(text);
    if (result.score > 5) {
      toast.error(
        `This message breaks the community guidelines. ${result.details}`,
      );
      return;
    }
    if (result.score >= 3) toast.warning(result.details);
    sendMessage.mutate(
      {
        event_id: event.id,
        host_id: hostId,
        sender_type: "host",
        sender_id: hostId,
        message: text,
      },
      {
        onSuccess: () => setInput(""),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Couldn't send"),
      },
    );
  };

  return (
    <div className="relative flex h-[calc(100dvh-170px)] min-h-[440px] overflow-hidden rounded-2xl border border-white/10 bg-[#121426] lg:h-[72vh]">
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/10 px-3 py-2.5 sm:px-4">
          <button
            onClick={onBack}
            aria-label="Back to groups"
            className="-ml-1 flex h-9 w-9 items-center justify-center rounded-full text-[#A5A8C3] hover:bg-white/[0.06] lg:hidden"
          >
            <FiArrowLeft className="h-5 w-5" />
          </button>
          <EventCover
            src={event.cover_image_url}
            seed={event.id}
            mood={event.mood}
            iconSize="sm"
            blurFill
            className="aspect-square w-10 shrink-0 rounded-xl"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {event.title}
            </p>
            <button
              onClick={onToggleMembers}
              className="text-xs text-[#A5A8C3] hover:text-white"
            >
              {members.length} member{members.length === 1 ? "" : "s"} ·{" "}
              {formatIST(event.next_available_date ?? event.time, "d MMM")}
            </button>
          </div>
          <button
            onClick={onToggleMembers}
            aria-pressed={showMembers}
            aria-label="Members"
            className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
              showMembers
                ? "bg-[#A020F0]/20 text-[#E9D5FF]"
                : "text-[#A5A8C3] hover:bg-white/[0.06]"
            }`}
          >
            <FiUsers className="h-4 w-4" />
          </button>
          <Link
            href={`/host-dashboard/experiences/${event.id}`}
            aria-label="Open event"
            title="Open event"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#A5A8C3] hover:bg-white/[0.06]"
          >
            <FiExternalLink className="h-4 w-4" />
          </Link>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-5">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-[#A020F0] border-t-transparent" />
            </div>
          ) : (messages ?? []).length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#A020F0]/15 text-[#D8B4FE]">
                <FiUsers className="h-5 w-5" />
              </span>
              <p className="mt-3 text-sm font-semibold text-white">
                Start the conversation
              </p>
              <p className="mt-1 max-w-xs text-xs text-[#777B98]">
                Welcome your guests, share what to bring or where to meet.
                Everyone who books sees it here.
              </p>
            </div>
          ) : (
            <MessageList
              messages={messages ?? []}
              hostId={hostId}
              memberById={memberById}
            />
          )}
          <div ref={endRef} />
        </div>

        {/* Composer */}
        <div className="border-t border-white/10 p-3">
          <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-1.5 pl-4 focus-within:border-[#A020F0]">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Message the group"
              className="max-h-[120px] min-h-9 min-w-0 flex-1 resize-none bg-transparent py-2 text-sm text-white placeholder-[#777B98] outline-none"
            />
            <button
              onClick={send}
              disabled={!input.trim() || sendMessage.isPending}
              aria-label="Send"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#A020F0] text-white transition hover:bg-[#8A1AD0] disabled:opacity-40"
            >
              <FiSend className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1.5 hidden px-2 text-[11px] text-[#777B98] sm:block">
            Enter to send · Shift + Enter for a new line
          </p>
        </div>
      </div>

      {/* Members */}
      {showMembers && (
        <div className="absolute inset-0 z-20 flex flex-col bg-[#121426] xl:static xl:w-64 xl:border-l xl:border-white/10">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <p className="text-sm font-semibold text-white">
              Members · {members.length + 1}
            </p>
            <button
              onClick={onToggleMembers}
              aria-label="Close members"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#A5A8C3] hover:bg-white/[0.06]"
            >
              <FiX className="h-4 w-4" />
            </button>
          </div>
          <ul className="flex-1 space-y-1 overflow-y-auto p-2">
            <li className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#A020F0] text-xs font-semibold text-white">
                You
              </span>
              <span className="text-sm text-white">You</span>
              <span className="ml-auto rounded-full bg-[#A020F0]/15 px-2 py-0.5 text-[10px] font-semibold text-[#E9D5FF]">
                Host
              </span>
            </li>
            {members.map((m) => (
              <li
                key={m.userId}
                className="flex items-center gap-2.5 rounded-lg px-2 py-1.5"
              >
                <Avatar name={m.name} src={m.avatar} />
                <span className="min-w-0 flex-1 truncate text-sm text-white">
                  {m.name}
                </span>
                <span className="text-xs text-[#777B98]">×{m.tickets}</span>
              </li>
            ))}
            {members.length === 0 && (
              <li className="px-2 py-3 text-xs text-[#777B98]">
                Guests appear here once they book.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function Avatar({ name, src }: { name: string; src: string | null }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className="h-8 w-8 shrink-0 rounded-full object-cover"
    />
  ) : (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function MessageList({
  messages,
  hostId,
  memberById,
}: {
  messages: InboxMessageDTO[];
  hostId: string;
  memberById: Map<string, Member>;
}) {
  return (
    <div className="space-y-1">
      {messages.map((msg, i) => {
        const prev = messages[i - 1];
        const at = new Date(msg.created_at);
        const newDay =
          !prev ||
          new Date(prev.created_at).toDateString() !== at.toDateString();
        // Consecutive messages from one person within 5 minutes form a block.
        const sameAuthor =
          !newDay &&
          prev?.sender_type === msg.sender_type &&
          prev?.sender_id === msg.sender_id &&
          at.getTime() - new Date(prev.created_at).getTime() < 5 * 60 * 1000;

        const day = newDay && (
          <div className="my-3 flex justify-center">
            <span className="rounded-full bg-white/[0.06] px-3 py-1 text-[11px] font-medium text-[#A5A8C3]">
              {dayLabel(at)}
            </span>
          </div>
        );

        if (msg.sender_type === "system") {
          return (
            <div key={msg.id}>
              {day}
              <p className="mx-auto my-2 max-w-md text-center text-xs text-[#777B98]">
                {msg.message}
              </p>
            </div>
          );
        }

        const mine = msg.sender_type === "host" && msg.sender_id === hostId;
        const member =
          msg.sender_type === "guest" && msg.sender_id
            ? memberById.get(msg.sender_id)
            : undefined;
        const name =
          msg.sender_type === "host"
            ? mine
              ? "You"
              : "Co-host"
            : (member?.name ?? "Guest");

        return (
          <div key={msg.id}>
            {day}
            <div
              className={`flex items-end gap-2 ${mine ? "justify-end" : ""} ${sameAuthor ? "" : "mt-3"}`}
            >
              {!mine && (
                <span className={sameAuthor ? "invisible" : ""}>
                  <Avatar name={name} src={member?.avatar ?? null} />
                </span>
              )}
              <div
                className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm ${
                  mine
                    ? "rounded-br-md bg-[#A020F0] text-white"
                    : "rounded-bl-md bg-white/[0.07] text-white"
                }`}
              >
                {!mine && !sameAuthor && (
                  <p
                    className={`mb-0.5 text-xs font-semibold ${msg.sender_type === "host" ? "text-[#D8B4FE]" : colourFor(msg.sender_id ?? name)}`}
                  >
                    {name}
                  </p>
                )}
                <p className="break-words whitespace-pre-wrap">{msg.message}</p>
                <p
                  className={`mt-0.5 text-right text-[10px] ${mine ? "text-white/70" : "text-[#777B98]"}`}
                >
                  {format(at, "h:mm a")}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
