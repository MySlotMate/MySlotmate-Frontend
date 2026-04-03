"use client";

import { useEffect, useState, useRef } from "react";
import { FiX, FiSend } from "react-icons/fi";
import { toast } from "sonner";
import { getEventMessages, sendMessage, type InboxMessageDTO } from "~/lib/api";
import { createSocket } from "~/lib/socket";
import { useContentModeration } from "~/hooks/useContentModeration";

interface InboxSidebarProps {
  eventId: string;
  hostId: string;
  eventTitle: string;
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function InboxSidebar({
  eventId,
  hostId,
  eventTitle,
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

    if (moderationResult.isBlocked) {
      toast.error(
        `Message blocked: Spam/fraud/safety risk detected (Risk Level: ${moderationResult.score}/10)`
      );
      return;
    }

    if (moderationResult.score > 5) {
      toast.warning(
        `⚠️ High-risk message (Risk Level: ${moderationResult.score}/10). Message sent but flagged for review.`
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
    <>
      {/* Overlay - covers left side only */}
      <div
        className="fixed top-0 left-0 bottom-0 bg-transparent bg-opacity-30 z-40 transition-opacity"
        onClick={onClose}
        style={{
          width: "calc(100% - 24rem)",
        }}
      />

      {/* Sidebar */}
      <div className="fixed top-0 right-0 w-96 h-screen z-50 bg-white shadow-lg flex flex-col transform transition-transform duration-300">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Event Inbox</h2>
            <p className="text-sm text-gray-600">{eventTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition"
          >
            <FiX className="h-6 w-6" />
          </button>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gray-50">
          {loading && messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0094CA] border-t-transparent" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center">
              <p className="text-gray-500">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.sender_type === "guest" && msg.sender_id === userId ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg ${
                    msg.sender_type === "guest" && msg.sender_id === userId
                      ? "bg-[#0094CA] text-white"
                      : "bg-white border border-gray-200 text-gray-900"
                  }`}
                >
                  <p className="text-sm">{msg.message}</p>
                  <p
                    className={`text-xs mt-1 ${
                      msg.sender_type === "guest" && msg.sender_id === userId
                        ? "text-blue-100"
                        : "text-gray-500"
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
        <div className="border-t border-gray-200 px-6 py-4 bg-white">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#0094CA] text-sm"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !messageText.trim()}
              className="px-4 py-2 bg-[#0094CA] text-white rounded-lg hover:bg-[#0076a3] disabled:opacity-50 transition"
            >
              <FiSend className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
