"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { FiTrash2, FiPlus } from "react-icons/fi";
import {
  getHostCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  type CouponDTO,
} from "~/lib/api";

interface Props {
  eventId: string;
  hostId: string;
}

// CouponsManager lists and edits the comp codes that apply to this experience
// (event-scoped coupons plus the host's event-wide ones). A coupon always waives
// a booking to free — there are no partial discounts.
export default function CouponsManager({ eventId, hostId }: Props) {
  const [coupons, setCoupons] = useState<CouponDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [perUserLimit, setPerUserLimit] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getHostCoupons(hostId);
      // Show coupons that apply here: this event, or host-wide (event_id null).
      setCoupons(
        res.data.filter((c) => c.event_id === eventId || c.event_id === null),
      );
    } catch {
      toast.error("Could not load coupons");
    } finally {
      setLoading(false);
    }
  }, [hostId, eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    if (!code.trim()) {
      toast.error("Enter a coupon code");
      return;
    }
    setCreating(true);
    try {
      await createCoupon({
        host_id: hostId,
        event_id: eventId,
        code: code.trim(),
        max_redemptions: maxRedemptions ? Number(maxRedemptions) : null,
        per_user_limit: perUserLimit ? Number(perUserLimit) : null,
        valid_until: validUntil ? new Date(validUntil).toISOString() : null,
        is_active: true,
      });
      toast.success("Coupon created");
      setCode("");
      setMaxRedemptions("");
      setPerUserLimit("");
      setValidUntil("");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create coupon");
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (c: CouponDTO) => {
    try {
      await updateCoupon(c.id, {
        host_id: hostId,
        event_id: c.event_id,
        code: c.code,
        max_redemptions: c.max_redemptions,
        per_user_limit: c.per_user_limit,
        valid_from: c.valid_from,
        valid_until: c.valid_until,
        is_active: !c.is_active,
      });
      void load();
    } catch {
      toast.error("Could not update coupon");
    }
  };

  const remove = async (c: CouponDTO) => {
    if (!window.confirm(`Delete coupon ${c.code}?`)) return;
    try {
      await deleteCoupon(c.id, hostId);
      toast.success("Coupon deleted");
      void load();
    } catch {
      toast.error("Could not delete coupon");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-gray-900">Coupons</h3>
        <p className="text-sm text-gray-500">
          Comp codes that let a guest book this experience for free.
        </p>
      </div>

      {/* Create row */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="CODE"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0094CA] sm:col-span-2"
        />
        <input
          type="number"
          min={1}
          value={maxRedemptions}
          onChange={(e) => setMaxRedemptions(e.target.value)}
          placeholder="Max uses"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0094CA]"
        />
        <input
          type="number"
          min={1}
          value={perUserLimit}
          onChange={(e) => setPerUserLimit(e.target.value)}
          placeholder="Per guest"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0094CA]"
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

      {/* List */}
      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : coupons.length === 0 ? (
        <p className="text-sm text-gray-400">No coupons yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                <th className="py-2 pr-3 font-medium">Code</th>
                <th className="py-2 pr-3 font-medium">Scope</th>
                <th className="py-2 pr-3 font-medium">Used</th>
                <th className="py-2 pr-3 font-medium">Per guest</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id} className="border-b border-gray-50">
                  <td className="py-2 pr-3 font-semibold text-gray-800">
                    {c.code}
                  </td>
                  <td className="py-2 pr-3 text-gray-500">
                    {c.event_id === null ? "All events" : "This event"}
                  </td>
                  <td className="py-2 pr-3 text-gray-600">
                    {c.times_redeemed}
                    {c.max_redemptions != null ? ` / ${c.max_redemptions}` : ""}
                  </td>
                  <td className="py-2 pr-3 text-gray-600">
                    {c.per_user_limit ?? "—"}
                  </td>
                  <td className="py-2 pr-3">
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
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      onClick={() => void remove(c)}
                      className="text-gray-400 hover:text-red-500"
                      aria-label="Delete coupon"
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
  );
}
