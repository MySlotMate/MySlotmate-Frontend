"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useBroadcastMessage,
  useEventMessages,
  useEventsByHost,
  useHostMessages,
  useMarkMessageRead,
  useSendMessage,
} from "~/hooks/useApi";
import { HostNavbar } from "~/components/host-dashboard";
import { createSocket } from "~/lib/socket";
import type { EventDTO, InboxMessageDTO } from "~/lib/api";
import { FiSearch, FiSend, FiVolume2 } from "react-icons/fi";
import { format } from "date-fns";

export default function HostMessagesPage() {
  const qc = useQueryClient();

  const [hostId, setHostId] = useState<string | null>(null);
  useEffect(() => {
    setHostId(localStorage.getItem("msm_host_id"));
  }, []);

  const { data: events, isLoading: loadingEvents } = useEventsByHost(hostId);
  const { data: hostMessages } = useHostMessages(hostId);

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  useEffect(() => {
    // Avoid `useSearchParams()` to keep this page build-friendly without Suspense.
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("event");
    if (fromUrl) setSelectedEventId(fromUrl);
  }, []);

  useEffect(() => {
    if (selectedEventId) return;
    const first = events?.[0]?.id ?? null;
    setSelectedEventId(first);
  }, [events, selectedEventId]);

  const { data: eventMessages } = useEventMessages(selectedEventId);

  const sendMessage = useSendMessage();
  const broadcastMessage = useBroadcastMessage();
  const markRead = useMarkMessageRead();

  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const markReadOnceRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [eventMessages]);

  /* Socket.IO real-time: join selected event room and refresh queries on updates */
  useEffect(() => {
    if (!hostId || !selectedEventId) return;

    const socket = createSocket();
    const room = `event_${selectedEventId}`;

    const join = () => socket.emit("join_room", room);
    socket.on("connect", join);
    join();

    socket.on("inbox_update", (payload: unknown) => {
      // Always refresh the host-wide list (left sidebar + unread badges)
      void qc.invalidateQueries({ queryKey: ["hostMessages", hostId] });

      // Refresh selected thread; if event_id is present, refresh that thread too.
      void qc.invalidateQueries({ queryKey: ["eventMessages", selectedEventId] });

      const maybe = payload as { event_id?: string };
      if (maybe?.event_id) {
        void qc.invalidateQueries({ queryKey: ["eventMessages", maybe.event_id] });
      }
    });

    return () => {
      socket.off("connect", join);
      socket.off("inbox_update");
      socket.disconnect();
    };
  }, [hostId, selectedEventId, qc]);

  /* Mark unread messages as read when viewing a thread */
  useEffect(() => {
    if (!eventMessages?.length) return;
    for (const m of eventMessages) {
      if (m.is_read) continue;
      if (markReadOnceRef.current.has(m.id)) continue;
      markReadOnceRef.current.add(m.id);
      markRead.mutate(m.id);
    }
  }, [eventMessages, markRead]);

  const eventById = useMemo(() => {
    const map = new Map<string, EventDTO>();
    for (const e of events ?? []) map.set(e.id, e);
    return map;
  }, [events]);

  const threadSummaryByEventId = useMemo(() => {
    const map = new Map<
      string,
      { last: InboxMessageDTO | null; unreadCount: number; lastAtMs: number }
    >();
    for (const m of hostMessages ?? []) {
      const cur =
        map.get(m.event_id) ??
        ({ last: null, unreadCount: 0, lastAtMs: 0 } as const);

      const createdAtMs = new Date(m.created_at).getTime();
      const last =
        !cur.last || createdAtMs >= new Date(cur.last.created_at).getTime()
          ? m
          : cur.last;
      const unreadCount = cur.unreadCount + (m.is_read ? 0 : 1);
      const lastAtMs = Math.max(cur.lastAtMs, createdAtMs);

      map.set(m.event_id, { last, unreadCount, lastAtMs });
    }
    return map;
  }, [hostMessages]);

  const filteredEvents = useMemo(() => {
    const list = [...(events ?? [])];
    list.sort((a, b) => {
      const aMeta = threadSummaryByEventId.get(a.id);
      const bMeta = threadSummaryByEventId.get(b.id);
      const aKey = aMeta?.lastAtMs ?? new Date(a.time).getTime();
      const bKey = bMeta?.lastAtMs ?? new Date(b.time).getTime();
      return bKey - aKey;
    });
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter((e) => e.title.toLowerCase().includes(q));
  }, [events, search, threadSummaryByEventId]);

  if (!hostId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <HostNavbar />
        <main className="mx-auto max-w-6xl site-x py-8">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            No host profile found. Please apply as a host first.
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <HostNavbar />

      <main className="mx-auto max-w-6xl site-x py-8">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="mt-1 text-sm text-gray-500">
            Select an event to view its thread. New messages arrive in real time.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left: event threads */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 lg:col-span-1">
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <FiSearch className="h-4 w-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-sm outline-none"
                placeholder="Search events…"
              />
            </div>

            {loadingEvents && (
              <div className="flex items-center justify-center py-10">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-[#0094CA] border-t-transparent" />
              </div>
            )}

            {!loadingEvents && filteredEvents.length === 0 && (
              <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
                No events found.
              </div>
            )}

            <div className="space-y-2">
              {filteredEvents.map((ev) => {
                const meta = threadSummaryByEventId.get(ev.id);
                const active = selectedEventId === ev.id;
                return (
                  <button
                    key={ev.id}
                    onClick={() => setSelectedEventId(ev.id)}
                    className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                      active
                        ? "border-[#0094CA] bg-[#e6f8ff]"
                        : "border-gray-200 bg-white hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {ev.title}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {format(new Date(ev.time), "EEE, MMM d")} • {format(new Date(ev.time), "h:mm a")}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {!!meta?.unreadCount && meta.unreadCount > 0 && (
                          <span className="shrink-0 rounded-full bg-[#0094CA] px-2 py-0.5 text-[10px] font-bold text-white">
                            {meta.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] text-gray-400">
                      {ev.total_bookings} Confirmed {meta?.unreadCount ? `· ${meta.unreadCount} Unread` : "· All read"}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: selected thread */}
          <div className="flex h-[70vh] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white lg:col-span-2">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <p className="truncate text-base font-semibold text-gray-900">
                    {selectedEventId
                      ? (eventById.get(selectedEventId)?.title ?? "Event thread")
                      : "Select an event"}
                  </p>
                  {selectedEventId && (
                    <span className="text-xs text-gray-500">
                      {format(new Date(eventById.get(selectedEventId)?.time ?? new Date()), "EEE, MMM d")}
                    </span>
                  )}
                </div>
                {selectedEventId && (
                  <div className="mt-1 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                      {eventById.get(selectedEventId)?.total_bookings ?? 0} Confirmed
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                      Active Session
                    </span>
                  </div>
                )}
              </div>

              <button
                disabled={!selectedEventId}
                className="flex items-center gap-2 rounded-lg bg-[#0094CA] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#007dab] disabled:opacity-50"
                onClick={() => {
                  if (!selectedEventId) return;
                  const message = window.prompt("Enter your broadcast announcement:");
                  if (!message?.trim()) return;
                  broadcastMessage.mutate(
                    { message: message.trim(), host_id: hostId, event_id: selectedEventId },
                  );
                }}
              >
                <FiVolume2 className="h-4 w-4" /> Broadcast Announcement
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {!selectedEventId && (
                <div className="flex h-full items-center justify-center text-sm text-gray-500">
                  Pick an event on the left to open messages.
                </div>
              )}

              {selectedEventId && (
                <div className="space-y-4">
                  {(eventMessages ?? []).map((msg, idx, arr) => {
                    const isMe = msg.sender_type === "host" && msg.sender_id === hostId;
                    const isSystem = msg.sender_type === "system";
                    const label =
                      msg.sender_type === "system"
                        ? "System"
                        : isMe
                          ? "You"
                          : msg.sender_type === "guest"
                            ? "Guest"
                            : "Host";

                    // Check if we need a day separator
                    const msgDate = new Date(msg.created_at);
                    const prevMsg = arr[idx - 1];
                    const prevDate = prevMsg ? new Date(prevMsg.created_at) : null;
                    const showDaySeparator = !prevDate || msgDate.toDateString() !== prevDate?.toDateString();

                    const today = new Date();
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);

                    let dayLabel = format(msgDate, "EEEE, MMM d");
                    if (msgDate.toDateString() === today.toDateString()) {
                      dayLabel = "Today";
                    } else if (msgDate.toDateString() === yesterday.toDateString()) {
                      dayLabel = "Yesterday";
                    }

                    return (
                      <div key={msg.id}>
                        {showDaySeparator && (
                          <div className="flex items-center justify-center my-4">
                            <span className="rounded-full bg-[#e6f8ff] px-3 py-1 text-xs font-medium text-[#0094CA]">
                              {dayLabel}
                            </span>
                          </div>
                        )}

                        {isSystem ? (
                          <div className="flex items-start gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
                              <span className="text-xs text-gray-500">⚙️</span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2 text-xs text-gray-400">
                                <span className="font-semibold text-gray-500">{label}</span>
                                <span>{format(msgDate, "h:mm a")}</span>
                              </div>
                              <p className="mt-1 text-sm text-gray-600">{msg.message}</p>
                            </div>
                          </div>
                        ) : (
                          <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                            <div className={`flex items-start gap-3 max-w-[85%] ${isMe ? "flex-row-reverse" : ""}`}>
                              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                isMe ? "bg-[#0094CA]" : "bg-amber-500"
                              }`}>
                                <span className="text-xs font-semibold text-white">
                                  {isMe ? "Y" : label.charAt(0)}
                                </span>
                              </div>
                              <div>
                                <div className={`flex items-center gap-2 text-xs text-gray-400 ${isMe ? "justify-end" : ""}`}>
                                  <span className="font-semibold text-gray-700">{label}</span>
                                  <span>{format(msgDate, "h:mm a")}</span>
                                  {isMe && (
                                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                                      Host
                                    </span>
                                  )}
                                </div>
                                <div
                                  className={`mt-1 rounded-2xl px-4 py-2 text-sm ${
                                    isMe
                                      ? "bg-[#0094CA] text-white"
                                      : "bg-gray-100 text-gray-900"
                                  }`}
                                >
                                  {msg.message}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <div className="border-t bg-white px-4 py-4">
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#0094CA] focus:bg-white"
                  placeholder={
                    selectedEventId ? "Write a message to the group..." : "Select an event first…"
                  }
                  disabled={!selectedEventId}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    if (!selectedEventId) return;
                    if (!input.trim()) return;
                    sendMessage.mutate(
                      {
                        event_id: selectedEventId,
                        host_id: hostId,
                        sender_type: "host",
                        sender_id: hostId,
                        message: input.trim(),
                      },
                      { onSuccess: () => setInput("") },
                    );
                  }}
                />
                <button
                  disabled={!selectedEventId || !input.trim()}
                  className="rounded-lg bg-[#0094CA] px-5 py-3 font-semibold text-white transition hover:bg-[#007dab] disabled:opacity-50 flex items-center gap-2"
                  onClick={() => {
                    if (!selectedEventId) return;
                    if (!input.trim()) return;
                    sendMessage.mutate(
                      {
                        event_id: selectedEventId,
                        host_id: hostId,
                        sender_type: "host",
                        sender_id: hostId,
                        message: input.trim(),
                      },
                      { onSuccess: () => setInput("") },
                    );
                  }}
                >
                  Send <FiSend className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 text-[10px] text-gray-400 text-right">Press ⌘+Enter to send</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
