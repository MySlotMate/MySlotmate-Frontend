"use client";

import { FiLock } from "react-icons/fi";

interface Props {
  isPrivate: boolean;
  accessPasskey: string;
  passkeyGrantsFree: boolean;
  /** Whether the event is free — the "passkey books free" option is paid-only. */
  isFree: boolean;
  showError?: boolean;
  onChange: (
    patch: Partial<{
      isPrivate: boolean;
      accessPasskey: string;
      passkeyGrantsFree: boolean;
    }>,
  ) => void;
}

// PrivacyAccessSection is the shared "Private experience" block used by the host
// new/edit forms. A private event stays listed in discovery with a lock; the
// passkey is required only at the Book step. For a paid event the passkey can
// also comp the booking to free.
export default function PrivacyAccessSection({
  isPrivate,
  accessPasskey,
  passkeyGrantsFree,
  isFree,
  showError,
  onChange,
}: Props) {
  return (
    <div className="space-y-4 border-t border-gray-100 pt-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            Private experience
          </h3>
          <p className="text-sm text-gray-500">
            Still shown in discovery with a lock — guests need a passkey to book.
            Share the passkey with your invited guests.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isPrivate}
          onClick={() => onChange({ isPrivate: !isPrivate })}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
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
        <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Passkey
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={accessPasskey}
                onChange={(e) => onChange({ accessPasskey: e.target.value })}
                placeholder="e.g. SUMMER24"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0094CA]"
              />
              <button
                type="button"
                onClick={() =>
                  onChange({
                    accessPasskey: Math.random()
                      .toString(36)
                      .slice(2, 8)
                      .toUpperCase(),
                  })
                }
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Generate
              </button>
            </div>
            {showError && !accessPasskey.trim() && (
              <p className="mt-1 text-xs text-red-500">
                A private experience needs a passkey.
              </p>
            )}
          </div>

          {!isFree && (
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={passkeyGrantsFree}
                onChange={(e) =>
                  onChange({ passkeyGrantsFree: e.target.checked })
                }
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-[#0094CA] focus:ring-[#0094CA]"
              />
              <span className="text-sm text-gray-700">
                <span className="flex items-center gap-1 font-medium">
                  <FiLock size={13} /> Passkey also lets guests book free
                </span>
                <span className="text-gray-500">
                  Guests who enter this passkey pay ₹0 — you comp the ticket.
                </span>
              </span>
            </label>
          )}
        </div>
      )}
    </div>
  );
}
