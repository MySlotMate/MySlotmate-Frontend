"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { FiTrash2, FiPlus, FiDownload, FiChevronDown } from "react-icons/fi";
import {
  getHostCoupons,
  createCoupon,
  createCouponsBatch,
  updateCoupon,
  deleteCoupon,
  type CouponDTO,
} from "~/lib/api";

// couponsToCsv renders the list to a CSV string the host can hand out / import.
function couponsToCsv(rows: CouponDTO[]): string {
  const header = ["code", "scope", "used", "status", "expires"];
  const body = rows.map((c) =>
    [
      c.code,
      c.event_id === null ? "all_events" : "this_event",
      c.times_redeemed > 0 ? "used" : "available",
      c.is_active ? "active" : "paused",
      c.valid_until ? new Date(c.valid_until).toISOString().slice(0, 10) : "",
    ].join(","),
  );
  return [header.join(","), ...body].join("\n");
}

interface Props {
  eventId: string;
  hostId: string;
  /** "access" = passkey codes (unlock a private event, guest pays);
   *  "free"   = free-booking codes (comp — book at ₹0). */
  kind: "access" | "free";
}

// CouponsManager manages ONE kind of single-use code for an experience: either
// access codes (per-guest passkeys) or free-booking codes (comps). Access and
// payment are decoupled, so the two are managed independently.
export default function CouponsManager({ eventId, hostId, kind }: Props) {
  const isFree = kind === "free";
  const [coupons, setCoupons] = useState<CouponDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [creating, setCreating] = useState(false);
  const [batchCount, setBatchCount] = useState("10");
  const [batchPrefix, setBatchPrefix] = useState("");
  const [generating, setGenerating] = useState(false);
  const [lastBatch, setLastBatch] = useState<CouponDTO[]>([]);
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getHostCoupons(hostId);
      // This event (or host-wide) AND the kind this manager handles.
      setCoupons(
        res.data.filter(
          (c) =>
            (c.event_id === eventId || c.event_id === null) &&
            c.grants_free === isFree,
        ),
      );
    } catch {
      toast.error("Could not load codes");
    } finally {
      setLoading(false);
    }
  }, [hostId, eventId, isFree]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    if (!code.trim()) {
      toast.error("Enter a code");
      return;
    }
    setCreating(true);
    try {
      await createCoupon({
        host_id: hostId,
        event_id: eventId,
        code: code.trim(),
        grants_free: isFree,
        // Every code is single-use, one per guest.
        max_redemptions: 1,
        per_user_limit: 1,
        valid_until: validUntil ? new Date(validUntil).toISOString() : null,
        is_active: true,
      });
      toast.success("Code created");
      setCode("");
      setValidUntil("");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create code");
    } finally {
      setCreating(false);
    }
  };

  const handleGenerate = async () => {
    const count = Number(batchCount);
    if (!count || count < 1 || count > 500) {
      toast.error("Enter a count between 1 and 500");
      return;
    }
    // Free codes move money — make the effect explicit before firing.
    const confirmMsg = isFree
      ? `Generate ${count} free-booking code${count > 1 ? "s" : ""}? Each one ` +
        `books this experience for FREE (₹0) — you comp the guest.`
      : `Generate ${count} access code${count > 1 ? "s" : ""}? Each one lets ` +
        `one guest into this private event; they pay the normal price.`;
    if (!window.confirm(confirmMsg)) {
      return;
    }
    setGenerating(true);
    try {
      const res = await createCouponsBatch({
        host_id: hostId,
        event_id: eventId,
        count,
        grants_free: isFree,
        prefix: batchPrefix.trim() || undefined,
      });
      setLastBatch(res.data);
      toast.success(`Generated ${count} code${count > 1 ? "s" : ""}`);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate codes");
    } finally {
      setGenerating(false);
    }
  };

  const download = (rows: CouponDTO[], filename: string) => {
    if (rows.length === 0) {
      toast.error("No codes to download");
      return;
    }
    const blob = new Blob([couponsToCsv(rows)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleActive = async (c: CouponDTO) => {
    try {
      await updateCoupon(c.id, {
        host_id: hostId,
        event_id: c.event_id,
        code: c.code,
        grants_free: c.grants_free,
        max_redemptions: c.max_redemptions,
        per_user_limit: c.per_user_limit,
        valid_from: c.valid_from,
        valid_until: c.valid_until,
        is_active: !c.is_active,
      });
      void load();
    } catch {
      toast.error("Could not update code");
    }
  };

  const remove = async (c: CouponDTO) => {
    if (!window.confirm(`Delete code ${c.code}?`)) return;
    try {
      await deleteCoupon(c.id, hostId);
      toast.success("Code deleted");
      void load();
    } catch {
      toast.error("Could not delete code");
    }
  };

  const removeAll = async () => {
    // Only the codes scoped to THIS event — never the host-wide ones.
    const own = coupons.filter((c) => c.event_id === eventId);
    if (own.length === 0) return;
    if (!window.confirm(`Delete all ${own.length} codes for this experience?`))
      return;
    try {
      await Promise.all(own.map((c) => deleteCoupon(c.id, hostId)));
      toast.success("Codes cleared");
      setLastBatch([]);
      void load();
    } catch {
      toast.error("Could not clear all codes");
    }
  };

  const filePrefix = isFree ? "free-codes" : "access-codes";

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            {isFree ? "Free-booking codes" : "Passkey codes (access)"}
          </h3>
          <p className="text-sm text-gray-500">
            {isFree
              ? "Each code books this experience for ₹0 — hand a unique one to each guest you want to comp."
              : "Each code lets one guest into this private event; they pay the normal price. A unique passkey per guest."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => download(coupons, `${filePrefix}-${eventId}.csv`)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <FiDownload size={15} /> All CSV
          </button>
          {coupons.some((c) => c.event_id === eventId) && (
            <button
              type="button"
              onClick={() => void removeAll()}
              className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <FiTrash2 size={15} /> Clear all
            </button>
          )}
        </div>
      </div>

      {/* Bulk generate — unique single-use codes, one per guest */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
        <p className="text-sm font-medium text-gray-700">Generate unique codes</p>
        <p className={`mb-2 text-xs ${isFree ? "text-amber-600" : "text-gray-500"}`}>
          {isFree
            ? "Each code books this experience for ₹0 — you comp the guest."
            : "Each code unlocks booking; guests still pay the normal price."}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            min={1}
            max={500}
            value={batchCount}
            onChange={(e) => setBatchCount(e.target.value)}
            className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0094CA]"
            placeholder="How many"
          />
          <input
            type="text"
            value={batchPrefix}
            onChange={(e) => setBatchPrefix(e.target.value.toUpperCase())}
            className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase outline-none focus:ring-2 focus:ring-[#0094CA]"
            placeholder="Prefix (opt)"
          />
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={generating}
            className="rounded-lg bg-[#0094CA] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#007ba8] disabled:opacity-50"
          >
            {generating ? "Generating…" : "Generate"}
          </button>
          <span className="text-xs text-gray-400">
            Single-use, one booking each. Generate again anytime to add more.
          </span>
        </div>
        {lastBatch.length > 0 && (
          <button
            type="button"
            onClick={() =>
              download(lastBatch, `${filePrefix}-batch-${lastBatch.length}.csv`)
            }
            className="mt-3 flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"
          >
            <FiDownload size={15} /> Download the {lastBatch.length} codes you just
            generated
          </button>
        )}
      </div>

      {/* Single create row — add one custom code (single-use, one per guest) */}
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Custom code (e.g. VIP)"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase outline-none focus:ring-2 focus:ring-[#0094CA]"
        />
        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={creating}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-[#0094CA] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#007ba8] disabled:opacity-50"
        >
          <FiPlus size={15} /> Add
        </button>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">
          Expires (optional)
        </label>
        <input
          type="date"
          value={validUntil}
          onChange={(e) => setValidUntil(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0094CA]"
        />
      </div>

      {/* List — collapsed by default; a batch of codes stays out of the way. */}
      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : coupons.length === 0 ? (
        <p className="text-sm text-gray-400">No codes yet.</p>
      ) : (
        <div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <span>
              {coupons.length} code{coupons.length > 1 ? "s" : ""}
            </span>
            <FiChevronDown
              size={16}
              className={`transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </button>

          {expanded && (
            <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-gray-100">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-white shadow-[0_1px_0_rgba(0,0,0,0.06)]">
                  <tr className="text-xs uppercase tracking-wide text-gray-400">
                    <th className="px-3 py-2 font-medium">Code</th>
                    <th className="px-3 py-2 font-medium">Used</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((c) => (
                    <tr key={c.id} className="border-t border-gray-50">
                      <td className="px-3 py-2 font-semibold text-gray-800">
                        {c.code}
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {c.times_redeemed > 0 ? "Used" : "Available"}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => void toggleActive(c)}
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            c.is_active
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {c.is_active ? "Active" : "Paused"}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => void remove(c)}
                          className="text-gray-400 hover:text-red-500"
                          aria-label="Delete code"
                        >
                          <FiTrash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
