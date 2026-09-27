"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { useIdToken } from "~/hooks/useIdToken";
import {
  listSharedEvents,
  requestCoHostWithdrawal,
  respondToCoHostInvite,
  type SharedEventDTO,
} from "~/lib/api";

const rupees = (cents: number) =>
  `₹${(cents / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

/**
 * SharedEventsCard — the CO-HOST's side of co-hosting, on the earnings page.
 *
 * Accept or decline an invitation, and — when the owner granted withdrawals —
 * withdraw the event's earnings to your own primary payout method. "Available"
 * is what is left after any earlier withdrawal on that event: once it is taken,
 * it is gone for everyone.
 */
export default function SharedEventsCard({
  /** On the earnings page the card hides itself when nobody shared anything.
   *  The dedicated co-hosting page passes true so the section still explains
   *  itself when the list is empty. */
  showWhenEmpty = false,
}: {
  showWhenEmpty?: boolean;
}) {
  const idToken = useIdToken();
  const [rows, setRows] = useState<SharedEventDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!idToken) return;
    setLoading(true);
    try {
      const res = await listSharedEvents(idToken);
      setRows(res.data ?? []);
    } catch {
      toast.error("Could not load shared experiences");
    } finally {
      setLoading(false);
    }
  }, [idToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRespond = async (row: SharedEventDTO, accept: boolean) => {
    if (!idToken) return;
    setBusyId(row.cohost_id);
    try {
      await respondToCoHostInvite(row.cohost_id, accept, idToken);
      toast.success(
        accept ? "You're co-hosting this one" : "Invitation declined",
      );
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const handleWithdraw = async (row: SharedEventDTO) => {
    if (!idToken) return;
    const typed = amounts[row.cohost_id]?.trim();
    // Blank = take whatever is left (the backend reads 0 as "the whole pool").
    const cents = typed ? Math.round(Number(typed) * 100) : 0;
    if (typed && (!Number.isFinite(cents) || cents <= 0)) {
      toast.error("Enter a valid amount");
      return;
    }
    if (cents > row.available_cents) {
      toast.error(`Only ${rupees(row.available_cents)} is available`);
      return;
    }
    setBusyId(row.cohost_id);
    try {
      const res = await requestCoHostWithdrawal(
        row.cohost_id,
        {
          amount_cents: cents,
          idempotency_key: `cohost_${row.cohost_id}_${Date.now()}`,
        },
        idToken,
      );
      toast.success(
        res.data.status === "failed"
          ? `Payout failed: ${res.data.last_error ?? "try again"}`
          : "Withdrawal started — it lands in your account shortly",
      );
      setAmounts((prev) => ({ ...prev, [row.cohost_id]: "" }));
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  if (!loading && rows.length === 0 && !showWhenEmpty) return null;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5">
      <h3 className="mb-1 text-sm font-semibold text-gray-900">
        Shared with you
      </h3>
      <p className="mb-4 text-xs text-gray-500">
        Experiences another host co-hosts with you. Earnings unlock after a
        session has happened, and each event&apos;s earnings can be withdrawn
        once — by you or by the owner, whoever goes first.
      </p>

      {loading ? (
        <p className="text-xs text-gray-400">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-gray-400">
          Nobody has shared an experience with you yet.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {rows.map((row) => (
            <li key={row.cohost_id} className="py-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <Link
                    href={`/host-dashboard/experiences/${row.event_id}`}
                    className="truncate text-sm font-medium text-gray-900 hover:underline"
                  >
                    {row.event_title}
                  </Link>
                  <p className="text-xs text-gray-500">
                    by {row.owner_name || "host"} ·{" "}
                    {row.status === "pending"
                      ? "invitation pending"
                      : row.can_withdraw
                        ? `${rupees(row.available_cents)} available`
                        : "withdrawals not enabled by the owner"}
                    {row.my_claimed_cents > 0 &&
                      ` · you withdrew ${rupees(row.my_claimed_cents)}`}
                  </p>
                  <p className="text-xs text-gray-400">
                    Invited {format(new Date(row.invited_at), "d MMM yyyy")} ·
                    runs{" "}
                    {format(new Date(row.event_time), "d MMM yyyy, h:mm a")}
                    {" · "}
                    {row.can_withdraw
                      ? "you can withdraw its earnings"
                      : "no earnings access"}
                  </p>
                </div>

                {row.status === "pending" ? (
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => void handleRespond(row, true)}
                      disabled={busyId === row.cohost_id}
                      className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleRespond(row, false)}
                      disabled={busyId === row.cohost_id}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>
                ) : row.can_withdraw && row.available_cents > 0 ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      inputMode="decimal"
                      value={amounts[row.cohost_id] ?? ""}
                      onChange={(e) =>
                        setAmounts((prev) => ({
                          ...prev,
                          [row.cohost_id]: e.target.value,
                        }))
                      }
                      placeholder="all"
                      aria-label="Amount in rupees"
                      className="w-24 rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:border-gray-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => void handleWithdraw(row)}
                      disabled={busyId === row.cohost_id}
                      className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                    >
                      {busyId === row.cohost_id ? "Sending…" : "Withdraw"}
                    </button>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
