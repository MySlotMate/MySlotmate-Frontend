"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { LuX, LuSearch, LuChevronRight, LuKeyRound } from "react-icons/lu";
import type { EventDTO } from "~/lib/api";
import ManageCodesModal from "./ManageCodesModal";

interface Props {
  hostId: string;
  events: EventDTO[];
  isOpen: boolean;
  onClose: () => void;
}

// HostCodesPickerModal is the dashboard quick-action entry point for managing
// access passkeys and coupons: pick any of the host's experiences, then hand off
// to ManageCodesModal. Codes attach to a saved event, so every experience is
// selectable (drafts included).
export default function HostCodesPickerModal({
  hostId,
  events,
  isOpen,
  onClose,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<{
    id: string;
    title: string;
  } | null>(null);

  useEffect(() => setMounted(true), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = events ?? [];
    if (!q) return list;
    return list.filter((e) => e.title.toLowerCase().includes(q));
  }, [events, query]);

  const handleClose = () => {
    setQuery("");
    setSelected(null);
    onClose();
  };

  if (!isOpen || !mounted) return null;

  // Once an experience is chosen, the codes manager takes over.
  if (selected) {
    return (
      <ManageCodesModal
        eventId={selected.id}
        eventTitle={selected.title}
        hostId={hostId}
        isOpen
        onClose={() => setSelected(null)}
      />
    );
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto bg-black/50 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div className="flex min-h-full items-start justify-center p-4 pt-10 sm:pt-16">
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative z-50 w-full max-w-lg overflow-hidden rounded-2xl bg-white p-5 text-left shadow-2xl sm:p-6"
        >
          {/* Header */}
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e6f8ff]">
                <LuKeyRound className="h-5 w-5 text-[#0094CA]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Codes &amp; passkey
                </h2>
                <p className="text-sm text-gray-500">
                  Pick an experience to manage its passkey and coupons.
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            >
              <LuX className="h-5 w-5" />
            </button>
          </div>

          {(events ?? []).length === 0 ? (
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
              Create an experience first, then you can add passkeys and coupons.
            </div>
          ) : (
            <>
              {/* Search */}
              <div className="mb-3 flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 focus-within:border-[#0094CA]">
                <LuSearch className="h-4 w-4 shrink-0 text-gray-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search experiences…"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>

              {/* Experience list */}
              <div className="max-h-80 space-y-2 overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="px-1 py-6 text-center text-sm text-gray-400">
                    No experiences match &ldquo;{query}&rdquo;.
                  </p>
                ) : (
                  filtered.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => setSelected({ id: e.id, title: e.title })}
                      className="flex w-full items-center gap-3 rounded-xl border border-gray-100 px-3 py-3 text-left transition hover:border-[#0094CA] hover:bg-[#e6f8ff]/40"
                    >
                      {e.cover_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={e.cover_image_url}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 shrink-0 rounded-lg bg-gray-100" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {e.title}
                        </p>
                        <p className="text-xs text-gray-400 capitalize">
                          {e.status}
                          {e.is_private ? " · private" : ""}
                        </p>
                      </div>
                      <LuChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
