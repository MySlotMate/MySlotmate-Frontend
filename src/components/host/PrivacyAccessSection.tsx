"use client";

export type AccessMode = "shared" | "unique";

/** Which gate a private event uses. Mirrors the API's private_access_mode. */
export type PrivateAccessMode = "passkey" | "rsvp";

interface Props {
  isPrivate: boolean;
  /** "passkey" = guests type a code; "rsvp" = guests ask and the host approves. */
  privateAccessMode: PrivateAccessMode;
  /** "shared" = one passkey for everyone; "unique" = a code per guest.
   *  Only meaningful when privateAccessMode is "passkey". */
  accessMode: AccessMode;
  accessPasskey: string;
  showError?: boolean;
  /** True on the edit form (event saved) — enables generating per-guest codes. */
  canGenerateCodes?: boolean;
  onChange: (
    patch: Partial<{
      isPrivate: boolean;
      privateAccessMode: PrivateAccessMode;
      accessMode: AccessMode;
      accessPasskey: string;
    }>,
  ) => void;
}

// PrivacyAccessSection is the shared "Private experience" block. It controls
// ACCESS ONLY — who can book. A private event stays listed with a lock, and is
// unlocked one of two ways:
//
//   passkey — the guest types a code: either ONE shared passkey, or a UNIQUE
//             per-guest code.
//   rsvp    — the guest requests to join and fills in the attendee-details form
//             configured for this experience; the host (or an admin) approves.
//
// Whether a booking is free is decided separately (event price, or free-booking
// codes) — neither gate ever implies free. Approving an RSVP unlocks booking; it
// does not book or charge anything on the guest's behalf.
export default function PrivacyAccessSection({
  isPrivate,
  privateAccessMode,
  accessMode,
  accessPasskey,
  showError,
  canGenerateCodes,
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
            Still shown in discovery with a lock — guests need a passkey to
            book. (Guests pay the normal price unless the event is free.)
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
          {/* Which gate: a code the guest types, or a request the host approves */}
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              {
                key: "passkey" as const,
                title: "Unlock with a code",
                desc: "Guests enter a passkey you share to book.",
              },
              {
                key: "rsvp" as const,
                title: "Request to join",
                desc: "Guests apply with their details; you approve each one.",
              },
            ].map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => onChange({ privateAccessMode: opt.key })}
                className={`rounded-lg border p-3 text-left transition ${
                  privateAccessMode === opt.key
                    ? "border-[#0094CA] bg-[#0094CA]/5 ring-1 ring-[#0094CA]"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <span className="block text-sm font-medium text-gray-800">
                  {opt.title}
                </span>
                <span className="mt-0.5 block text-xs text-gray-500">
                  {opt.desc}
                </span>
              </button>
            ))}
          </div>

          {privateAccessMode === "rsvp" ? (
            <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-3">
              <p className="text-sm text-gray-600">
                Guests see a <strong>Request to join</strong> button instead of a
                passkey prompt. They fill in the details you asked for in the
                Attendee details step, plus an optional note, and their request
                lands in your dashboard for approval.
              </p>
              <p className="text-xs text-gray-500">
                Approving unlocks booking — the guest still books and pays as
                normal. Their spot isn&apos;t held until they do.
              </p>
              <p className="text-xs font-medium text-amber-700">
                Requires attendee details: turn them on and pick at least one
                field, or there&apos;s nothing for you to judge a request on.
              </p>
            </div>
          ) : (
          <>
          {/* Access mode: one shared passkey vs a unique passkey per guest */}
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              {
                key: "shared" as const,
                title: "Same passkey for everyone",
                desc: "One passkey you share with all invited guests.",
              },
              {
                key: "unique" as const,
                title: "A unique passkey per guest",
                desc: "Generate single-use access codes, one per guest.",
              },
            ].map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => onChange({ accessMode: opt.key })}
                className={`rounded-lg border p-3 text-left transition ${
                  accessMode === opt.key
                    ? "border-[#0094CA] bg-[#0094CA]/5 ring-1 ring-[#0094CA]"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <span className="block text-sm font-medium text-gray-800">
                  {opt.title}
                </span>
                <span className="mt-0.5 block text-xs text-gray-500">
                  {opt.desc}
                </span>
              </button>
            ))}
          </div>

          {accessMode === "shared" ? (
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
          ) : (
            <p className="text-sm text-gray-600">
              Each guest gets their own single-use access code that unlocks
              booking.{" "}
              {canGenerateCodes ? (
                <span>Generate them in the Passkey codes section below.</span>
              ) : (
                <span className="text-gray-400">
                  Save the experience first, then generate them in the Passkey
                  codes section.
                </span>
              )}
            </p>
          )}
          </>
          )}
        </div>
      )}
    </div>
  );
}
