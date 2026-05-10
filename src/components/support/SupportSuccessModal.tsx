"use client";

import Link from "next/link";
import { FiClock, FiCopy, FiX } from "react-icons/fi";
import { toast } from "sonner";

interface SupportSuccessModalProps {
  open: boolean;
  ticketId: string | null;
  onClose: () => void;
  title?: string;
  description?: string;
}

export default function SupportSuccessModal({
  open,
  ticketId,
  onClose,
  title = "We’ve received your request",
  description = "Thanks for reaching out. Our support team is reviewing your request and will get back to you shortly.",
}: SupportSuccessModalProps) {
  if (!open) {
    return null;
  }

  const shortTicketId = ticketId
    ? `#REQ-${ticketId.replace(/-/g, "").slice(0, 8).toUpperCase()}`
    : null;

  const handleCopy = async () => {
    if (!ticketId) {
      return;
    }

    try {
      await navigator.clipboard.writeText(ticketId);
      toast.success("Ticket ID copied");
    } catch {
      toast.error("Could not copy the ticket ID");
    }
  };

  return (
    <div
      className="fixed inset-0 z-80 flex items-center justify-center bg-slate-900/45 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-4xl bg-linear-to-b from-white to-[#ebf9ff] p-8 text-center shadow-[0_30px_80px_rgba(15,23,42,0.22)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full p-2 text-gray-400 transition hover:bg-white/80 hover:text-gray-700"
          aria-label="Close success message"
        >
          <FiX className="h-5 w-5" />
        </button>

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#bfe9fb] bg-white text-3xl font-black text-[#0094CA] shadow-sm">
          M
        </div>

        <h2 className="mt-6 text-3xl font-bold tracking-tight text-slate-900">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>

        {shortTicketId && (
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#e6f8ff] px-4 py-2 text-sm font-semibold text-[#007dab]">
            <span>Ticket ID {shortTicketId}</span>
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-full p-1 transition hover:bg-white"
              aria-label="Copy ticket ID"
            >
              <FiCopy className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="mt-6 flex items-center gap-3 rounded-2xl bg-white/90 px-4 py-4 text-left shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e6f8ff] text-[#0094CA]">
            <FiClock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Expected response time
            </p>
            <p className="text-xs text-slate-500">
              Usually within 24 business hours.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <Link
            href="/host-dashboard"
            onClick={onClose}
            className="block rounded-xl bg-[#0094CA] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#007dab]"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/support/tickets"
            onClick={onClose}
            className="block text-sm font-medium text-slate-500 transition hover:text-[#0094CA]"
          >
            View tickets raised
          </Link>
        </div>
      </div>
    </div>
  );
}
