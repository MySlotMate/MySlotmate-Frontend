"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FiAlertCircle, FiChevronRight } from "react-icons/fi";
import { getEventAttention, type EventAttentionItemDTO } from "~/lib/api";

// NeedsAttention shows what about this experience needs the host's eye:
// join requests waiting, shared codes nearly or fully used up or ending soon,
// and monthly passes ending this week. The admin editor shows the same list.
// Renders nothing when there is nothing to show (or it can't be loaded).
export default function NeedsAttention({ eventId }: { eventId: string }) {
  const [items, setItems] = useState<EventAttentionItemDTO[]>([]);

  useEffect(() => {
    let cancelled = false;
    getEventAttention(eventId)
      .then((res) => {
        if (!cancelled) setItems(res.data ?? []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  if (items.length === 0) return null;

  return (
    <section
      aria-label="Needs attention"
      className="rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] p-4"
    >
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-200">
        <FiAlertCircle className="h-4 w-4" /> Needs attention
      </h2>
      <ul className="divide-y divide-white/[0.06]">
        {items.map((it, i) => (
          <li key={`${it.kind}-${it.code ?? i}`} className="py-2">
            {it.kind === "join_requests" ? (
              <Link
                href="/host-dashboard/requests"
                className="flex items-center justify-between gap-3 text-sm text-white hover:text-[#D8B4FE]"
              >
                {it.title}
                <FiChevronRight className="h-4 w-4 shrink-0 text-white/50" />
              </Link>
            ) : (
              <p className="text-sm text-white/85">{it.title}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
