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
      className="msm-modal fixed inset-0 z-80 flex items-center justify-center bg-black/45 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-4xl bg-linear-to-b from-[#121426] to-[#080914] p-8 text-center shadow-[0_30px_80px_rgba(15,23,42,0.22)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full p-2 text-[#777B98] transition hover:bg-[#121426]/80 hover:text-white/80"
          aria-label="Close success message"
        >
          <FiX className="h-5 w-5" />
        </button>

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-[#121426] text-3xl font-black text-[#D8B4FE] shadow-sm">
          M
        </div>

        <h2 className="mt-6 text-3xl font-bold tracking-tight text-white">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-[#A5A8C3]">{description}</p>

        {shortTicketId && (
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#241333] px-4 py-2 text-sm font-semibold text-[#D8B4FE]">
            <span>Ticket ID {shortTicketId}</span>
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-full p-1 transition hover:bg-[#121426]"
              aria-label="Copy ticket ID"
            >
              <FiCopy className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="mt-6 flex items-center gap-3 rounded-2xl bg-[#121426]/90 px-4 py-4 text-left shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#241333] text-[#D8B4FE]">
            <FiClock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              Expected response time
            </p>
            <p className="text-xs text-[#A5A8C3]">
              Usually within 24 business hours.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <Link
            href="/host-dashboard"
            onClick={onClose}
            className="block rounded-xl bg-[#A020F0] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#8A1AD0]"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/support/tickets"
            onClick={onClose}
            className="block text-sm font-medium text-[#A5A8C3] transition hover:text-[#D8B4FE]"
          >
            View tickets raised
          </Link>
        </div>
      </div>
    </div>
  );
}
