"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { FiSend, FiTrash2, FiUserPlus } from "react-icons/fi";
import { format } from "date-fns";
import { useIdToken } from "~/hooks/useIdToken";
import { auth } from "~/utils/firebase";
import {
  inviteCoHost,
  listEventCoHosts,
  resendCoHostInvite,
  revokeCoHost,
  setCoHostCanWithdraw,
  type CoHostDTO,
} from "~/lib/api";

const rupees = (cents: number) =>
  `₹${(cents / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const STATUS_LABEL: Record<CoHostDTO["status"], string> = {
  pending: "Invite sent",
  accepted: "Co-hosting",
  declined: "Declined",
  revoked: "Removed",
  awaiting_signup: "Waiting for them to join",
};

/**
 * CoHostManager — the OWNER's panel for one event.
 *
 * A co-host co-manages the event (edit, attendees, check-in) and, when the
 * withdraw toggle is on, can pull this event's earnings to their own bank
 * account. The money still belongs to the owner's balance: a co-host withdrawal
 * only redirects where the payout lands, and each event's earnings can go out
 * once — whoever withdraws first, that slice is gone.
 */
export default function CoHostManager({ eventId }: { eventId: string }) {
  const idToken = useIdToken();
  const [rows, setRows] = useState<CoHostDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  // Earnings access, decided at invite time. Off by default: co-managing an
  // experience and being able to take its money are separate grants.
  const [grantWithdraw, setGrantWithdraw] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!idToken) return;
    setLoading(true);
    try {
      const res = await listEventCoHosts(eventId, idToken);
      setRows(res.data ?? []);
    } catch {
      toast.error("Could not load co-hosts");
    } finally {
      setLoading(false);
    }
  }, [eventId, idToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleInvite = async () => {
    if (!idToken) return;
    const typed = email.trim().toLowerCase();
    if (!typed) {
      toast.error("Enter the co-host's email");
      return;
    }
    if (typed === auth.currentUser?.email?.trim().toLowerCase()) {
      toast.error(
        "That's your own email. Enter the email of the host you want to invite.",
      );
      return;
    }
    setInviting(true);
    try {
      const res = await inviteCoHost(
        {
          event_id: eventId,
          email: email.trim(),
          can_withdraw: grantWithdraw,
        },
        idToken,
      );
      setEmail("");
      setGrantWithdraw(false);
      toast.success(
        res.data?.status === "awaiting_signup"
          ? "Invitation sent. They're not a host yet, so it will be waiting for them once they join MySlotMate as a host with this email."
          : "Invitation sent",
      );
      await load();
    } catch (err) {
      const message = (err as Error).message;
      toast.error(
        /timeout/i.test(message)
          ? "The server is taking too long to answer. Your invite may still have gone through, so check the list below in a minute before trying again."
          : message,
      );
      if (/timeout/i.test(message)) setTimeout(() => void load(), 15_000);
    } finally {
      setInviting(false);
    }
  };

  const handleToggle = async (row: CoHostDTO) => {
    if (!idToken) return;
    setBusyId(row.id);
    try {
      await setCoHostCanWithdraw(row.id, !row.can_withdraw, idToken);
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id ? { ...r, can_withdraw: !r.can_withdraw } : r,
        ),
      );
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const handleResend = async (row: CoHostDTO) => {
    if (!idToken) return;
    setBusyId(row.id);
    try {
      await resendCoHostInvite(row.id, idToken);
      toast.success(`Invitation re-sent to ${row.host_email}`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const handleRevoke = async (row: CoHostDTO) => {
    if (!idToken) return;
    setBusyId(row.id);
    try {
      await revokeCoHost(row.id, idToken);
      toast.success(`${row.host_name || row.host_email} removed`);
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const live = rows.filter(
    (r) =>
      r.status === "pending" ||
      r.status === "accepted" ||
      r.status === "awaiting_signup",
  );

  return (
    <div>
      <h3 className="mb-1 text-sm font-semibold text-white">Co-hosts</h3>
      <p className="mb-4 text-xs text-[#A5A8C3]">
        Share this experience with another host. They can manage it with you,
        and — if you turn on withdrawals — take this event&apos;s earnings to
        their own bank account. Each event&apos;s earnings can only be withdrawn
        once, by whoever goes first.
      </p>

      <div className="mb-2 flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="co-host's email"
          className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm focus:border-white/15 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => void handleInvite()}
          disabled={inviting || !idToken}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#A020F0] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          <FiUserPlus className="h-4 w-4" />
          {inviting ? "Inviting…" : "Invite"}
        </button>
      </div>

      <p className="mb-2 text-xs text-[#777B98]">
        Use the email they sign in to MySlotMate with. Not on MySlotMate yet?
        We&apos;ll email them, and the invite waits until they become a host.
      </p>

      <label className="mb-4 flex items-center gap-2 text-xs text-white/80">
        <input
          type="checkbox"
          checked={grantWithdraw}
          onChange={(e) => setGrantWithdraw(e.target.checked)}
          className="h-4 w-4 rounded border-white/15"
        />
        Let them withdraw this experience&apos;s earnings to their own bank
        account
      </label>

      {loading ? (
        <p className="text-xs text-[#777B98]">Loading…</p>
      ) : live.length === 0 ? (
        <p className="text-xs text-[#777B98]">
          No co-hosts on this experience.
        </p>
      ) : (
        <ul className="divide-y divide-white/10 rounded-lg border border-white/10">
          {live.map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">
                  {row.host_name || row.host_email}
                </p>
                <p className="truncate text-xs text-[#A5A8C3]">
                  {row.host_email} · {STATUS_LABEL[row.status]}
                  {row.claimed_cents > 0 &&
                    ` · withdrew ${rupees(row.claimed_cents)}`}
                </p>
                <p className="truncate text-xs text-[#777B98]">
                  Invited {format(new Date(row.created_at), "d MMM yyyy")}
                  {row.responded_at
                    ? ` · ${row.status === "accepted" ? "accepted" : "answered"} ${format(
                        new Date(row.responded_at),
                        "d MMM yyyy",
                      )}`
                    : row.status === "awaiting_signup"
                      ? " · not a host yet"
                      : " · awaiting their reply"}
                  {" · "}
                  {row.can_withdraw
                    ? "earnings access granted"
                    : "no earnings access"}
                </p>
              </div>

              <div className="flex items-center gap-4">
                {/* The withdraw toggle gates future withdrawals only — money
                    already sent out stays sent. */}
                <label className="flex items-center gap-2 text-xs text-white/80">
                  <input
                    type="checkbox"
                    checked={row.can_withdraw}
                    disabled={busyId === row.id || !idToken}
                    onChange={() => void handleToggle(row)}
                    className="h-4 w-4 rounded border-white/15"
                  />
                  Can withdraw
                </label>
                {(row.status === "pending" ||
                  row.status === "awaiting_signup") && (
                  <button
                    type="button"
                    onClick={() => void handleResend(row)}
                    disabled={busyId === row.id}
                    aria-label="Resend invitation"
                    title="Resend invitation email"
                    className="rounded p-1.5 text-[#777B98] hover:bg-white/[0.04] hover:text-white/80 disabled:opacity-50"
                  >
                    <FiSend className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void handleRevoke(row)}
                  disabled={busyId === row.id}
                  aria-label="Remove co-host"
                  className="rounded p-1.5 text-[#777B98] hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                >
                  <FiTrash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
