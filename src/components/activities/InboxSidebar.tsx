"use client";

import { useEffect, useState, useRef } from "react";
import { FiUsers, FiX, FiSend, FiMessageCircle } from "react-icons/fi";
import { toast } from "sonner";
import { getEventMessages, sendMessage, type InboxMessageDTO } from "~/lib/api";
import { createSocket } from "~/lib/socket";
import { useContentModeration } from "~/hooks/useContentModeration";
import { usePublicHostProfile } from "~/hooks/useApi";

interface InboxSidebarProps {
  eventId: string;
  hostId: string;
  eventTitle: string;
  participantCount: number;
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function InboxSidebar({
  eventId,
  hostId,
  eventTitle,
  participantCount,
  userId,
  isOpen,
  onClose,
}: InboxSidebarProps) {
  const [messages, setMessages] = useState<InboxMessageDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { checkContentSync } = useContentModeration();
  const { data: host } = usePublicHostProfile(hostId);
  const hostName = host
    ? `${host.first_name} ${host.last_name}`.trim()
    : "your host";
  const participantLabel = `${participantCount} ${
    participantCount === 1 ? "participant" : "participants"
  }`;

  // Initial fetch and Socket.IO real-time updates
  useEffect(() => {
    if (!isOpen) return;

    const fetchMessages = async () => {
      setLoading(true);
      try {
        const envelope = await getEventMessages(eventId);
        setMessages(envelope.data ?? []);
      } catch (error) {
        console.error("Failed to fetch messages:", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchMessages();

    // Set up Socket.IO real-time updates
    const socket = createSocket();
    const room = `event_${eventId}`;

    const join = () => socket.emit("join_room", room);
    socket.on("connect", join);
    join();

    socket.on("inbox_update", () => {
      // Refetch messages when an update is received
      void fetchMessages();
    });

    return () => {
      socket.off("connect", join);
      socket.off("inbox_update");
      socket.disconnect();
    };
  }, [isOpen, eventId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    // Check content moderation
    const moderationResult = checkContentSync(messageText);

    if (moderationResult.score > 5) {
      toast.error(
        `Message violates community guidelines (Risk Level: ${moderationResult.score}/10). ${moderationResult.details}`,
      );
      return;
    }

    if (moderationResult.score >= 3) {
      toast.warning(
        `⚠️ Warning: ${moderationResult.details} (Risk Level: ${moderationResult.score}/10)`,
      );
    }

    setSending(true);
    try {
      const envelope = await sendMessage({
        event_id: eventId,
        host_id: hostId,
        sender_type: "guest",
        sender_id: userId,
        message: messageText,
      });
      setMessages([...messages, envelope.data]);
      setMessageText("");
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="msm-modal fixed inset-0 z-[320]">
      <button
        type="button"
        aria-label="Close inbox"
        className="absolute inset-0 bg-black/18 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="absolute top-0 right-0 z-[330] flex h-screen w-full max-w-96 transform flex-col overflow-hidden bg-[#121426] shadow-2xl transition-transform duration-300">
        {/* Header */}
        <div className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-[#080914] via-[#121426] to-[#080914] px-6 pt-6 pb-5">
          <div className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-[#A020F0]/12 blur-2xl" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-24 w-24 rounded-full bg-[#00c2a8]/10 blur-2xl" />

          <button
            type="button"
            aria-label="Close inbox"
            onClick={onClose}
            className="absolute top-4 right-4 z-20 rounded-full border border-white/80 bg-white/85 p-2 text-[#A5A8C3] shadow-sm backdrop-blur transition hover:bg-[#121426] hover:text-white"
          >
            <FiX className="h-5 w-5" />
          </button>

          <div className="relative flex items-start gap-4 pr-14">
            <div className="min-w-0 flex-1">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#121426]/80 px-3 py-1 text-[11px] font-semibold tracking-[0.24em] text-[#0076a3] uppercase shadow-sm backdrop-blur">
                <FiMessageCircle className="h-3.5 w-3.5" />
                Event Inbox
              </div>

              <h2 className="text-2xl leading-tight font-bold text-white">
                {eventTitle}
              </h2>

              <p className="mt-2 text-sm text-[#A5A8C3] italic">
                ~ Hosted by {hostName}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#A020F0] px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-[#A020F0]/25">
                  <FiUsers className="h-3.5 w-3.5" />
                  {participantLabel}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 space-y-4 overflow-y-auto bg-white/[0.04] px-6 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {loading && messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#A020F0] border-t-transparent" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center">
              <div className="max-w-xs rounded-3xl border border-white/10 bg-[#121426] px-6 py-8 shadow-[0_18px_45px_-30px_rgba(0,148,202,0.55)]">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#A020F0] to-[#00bfa5] text-white shadow-lg shadow-[#A020F0]/25">
                  <FiMessageCircle className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">
                  Start the conversation
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#A5A8C3]">
                  Ask the host about the plan, the meeting point, or anything
                  you want to know before the event.
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.sender_type === "guest" && msg.sender_id === userId
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs rounded-lg px-4 py-2 ${
                    msg.sender_type === "guest" && msg.sender_id === userId
                      ? "bg-[#A020F0] text-white"
                      : "border border-white/10 bg-[#121426] text-white"
                  }`}
                >
                  <p className="text-sm">{msg.message}</p>
                  <p
                    className={`mt-1 text-xs ${
                      msg.sender_type === "guest" && msg.sender_id === userId
                        ? "text-[#D8B4FE]"
                        : "text-[#A5A8C3]"
                    }`}
                  >
                    {msg.sender_type === "host"
                      ? "Host"
                      : msg.sender_type === "system"
                        ? "System"
                        : "You"}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="border-t border-white/10 bg-[#121426] px-6 py-4">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 rounded-lg border border-white/15 px-3 py-2 text-sm focus:border-[#A020F0] focus:outline-none"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !messageText.trim()}
              className="rounded-lg bg-[#A020F0] px-4 py-2 text-white transition hover:bg-[#0076a3] disabled:opacity-50"
            >
              <FiSend className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
