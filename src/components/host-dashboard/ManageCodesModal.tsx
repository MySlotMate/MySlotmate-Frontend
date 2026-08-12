"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FiX, FiCopy, FiRefreshCw, FiLock } from "react-icons/fi";
import { getEvent } from "~/lib/api";
import { useUpdateEvent } from "~/hooks/useApi";
import CouponsManager from "~/components/host/CouponsManager";

interface Props {
  eventId: string;
  eventTitle: string;
  hostId: string;
  isOpen: boolean;
  onClose: () => void;
}

const genCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

// ManageCodesModal is the quick "codes & passkey" panel opened from an
// experience card. It lets a host see/set the private-access passkey and
// add/remove access codes and free-booking coupons without opening the full
// edit form.
export default function ManageCodesModal({
  eventId,
  eventTitle,
  hostId,
  isOpen,
  onClose,
}: Props) {
  const [isPrivate, setIsPrivate] = useState(false);
  const [isFree, setIsFree] = useState(false);
  const [passkey, setPasskey] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const updateEvent = useUpdateEvent();

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        // Fetch with host_id so the (otherwise stripped) passkey comes back.
        const res = await getEvent(eventId, hostId);
        if (cancelled) return;
        setIsPrivate(res.data.is_private);
        setIsFree(res.data.is_free);
        setPasskey(res.data.access_passkey ?? "");
      } catch {
        toast.error("Could not load access settings");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, eventId, hostId]);

  const persist = async (nextPasskey: string, nextPrivate: boolean) => {
    setSaving(true);
    try {
      await updateEvent.mutateAsync({
        eventId,
        body: {
          host_id: hostId,
          is_private: nextPrivate,
          access_passkey: nextPrivate ? nextPasskey.trim() : "",
        },
      });
      setIsPrivate(nextPrivate);
      setPasskey(nextPrivate ? nextPasskey.trim() : "");
      toast.success("Saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Codes &amp; passkey
            </h2>
            <p className="text-sm text-gray-500">{eventTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <FiX size={20} />
          </button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-gray-400">Loading…</p>
        ) : (
          <div className="space-y-6">
            {/* Private access + shared passkey */}
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                    <FiLock size={14} /> Private access
                  </h3>
                  <p className="text-xs text-gray-500">
                    Require a passkey to book. Guests still pay unless the event
                    is free.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isPrivate}
                  disabled={saving}
                  onClick={() =>
                    isPrivate
                      ? void persist("", false)
                      : void persist(passkey.trim() || genCode(), true)
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                    isPrivate ? "bg-[#0094CA]" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                      isPrivate ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {isPrivate && (
                <div className="mt-3">
                  <div className="flex gap-2">
                    <input
                      value={passkey}
                      onChange={(e) => setPasskey(e.target.value)}
                      placeholder="Passkey"
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0094CA]"
                    />
                    <button
                      onClick={() => setPasskey(genCode())}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                      title="Generate new"
                    >
                      <FiRefreshCw size={14} />
                    </button>
                    <button
                      onClick={() => {
                        void navigator.clipboard.writeText(passkey);
                        toast.success("Passkey copied");
                      }}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                      title="Copy"
                    >
                      <FiCopy size={14} />
                    </button>
                  </div>
                  <button
                    onClick={() => void persist(passkey, true)}
                    disabled={saving || !passkey.trim()}
                    className="mt-2 rounded-lg bg-[#0094CA] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#007ba8] disabled:opacity-50"
                  >
                    Save passkey
                  </button>
                </div>
              )}
            </div>

            {/* Per-guest access codes */}
            <CouponsManager eventId={eventId} hostId={hostId} kind="access" />

            {/* Free-booking coupons — only meaningful for a paid event. */}
            {!isFree && (
              <CouponsManager eventId={eventId} hostId={hostId} kind="free" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
