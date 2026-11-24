"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FiChevronDown, FiDownload, FiTrash2 } from "react-icons/fi";
import {
  createCoupon,
  createCouponsBatch,
  deleteCoupon,
  getHostCoupons,
  updateCoupon,
  type CouponDTO,
} from "~/lib/api";

/** What a code does when a guest enters it. Every kind also unlocks a
 *  private-with-code experience. */
type CodeEffect = "unlock" | "percent" | "free";

function codeEffectOf(c: CouponDTO): CodeEffect {
  if (c.discount_percent != null) return "percent";
  return c.grants_free ? "free" : "unlock";
}

function codeEffectLabel(c: CouponDTO): string {
  const e = codeEffectOf(c);
  if (e === "percent") return `${c.discount_percent}% off`;
  if (e === "free") return "Free";
  return "Unlocks";
}

const genCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

// Date inputs give "YYYY-MM-DD"; a code starts at the start of that day and
// lasts to the end of its last day, in the host's own time zone.
const startOfDay = (d: string) =>
  d ? new Date(`${d}T00:00:00`).toISOString() : null;
const endOfDay = (d: string) =>
  d ? new Date(`${d}T23:59:59`).toISOString() : null;
const shortDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      })
    : "";

function usedLabel(c: CouponDTO): string {
  if (c.max_redemptions === 1) return c.times_redeemed > 0 ? "Used" : "Unused";
  return `${c.times_redeemed} / ${c.max_redemptions ?? "∞"}`;
}

function validLabel(c: CouponDTO): string {
  if (c.valid_from && c.valid_until)
    return `${shortDate(c.valid_from)} – ${shortDate(c.valid_until)}`;
  if (c.valid_until) return `Till ${shortDate(c.valid_until)}`;
  if (c.valid_from) return `From ${shortDate(c.valid_from)}`;
  return "Always";
}

function codesToCsv(rows: CouponDTO[]): string {
  const header = ["code", "does", "scope", "used", "status", "valid"];
  const body = rows.map((c) =>
    [
      c.code,
      codeEffectLabel(c),
      c.event_id === null ? "all_experiences" : "this_experience",
      usedLabel(c),
      c.is_active ? "active" : "paused",
      validLabel(c),
    ]
      .map((v) => (/[",]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v))
      .join(","),
  );
  return [header.join(","), ...body].join("\n");
}

interface Props {
  eventId: string;
  hostId: string;
  /** The experience itself is free: nothing to discount, so no % off / Free. */
  isFree: boolean;
  /** Booking needs a code ("Who can book?" = People with a code). */
  codeGated: boolean;
  /**
   * "price" (default): the Codes section, % off and Free codes only.
   * "access": inside "Who can book? → A code per guest", single-use codes
   * that only unlock booking. The one shared entry code is the passkey set
   * in "Who can book?" itself, so it never appears here.
   */
  mode?: "price" | "access";
}

const EFFECTS: { key: CodeEffect; title: string; desc: string }[] = [
  {
    key: "unlock",
    title: "Unlock only",
    desc: "Lets the guest book. They pay the normal price.",
  },
  {
    key: "percent",
    title: "% off",
    desc: "Takes a share off the tickets. You absorb it.",
  },
  {
    key: "free",
    title: "Free",
    desc: "Books at ₹0. You comp the guest.",
  },
];

const input =
  "rounded-lg border border-white/15 bg-[#0e1020] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-[#A020F0]";

function Choice({
  active,
  title,
  desc,
  onClick,
}: {
  active: boolean;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`rounded-lg border p-3 text-left transition ${
        active
          ? "border-[#A020F0] bg-[#A020F0]/10 ring-1 ring-[#A020F0]"
          : "border-white/10 bg-[#0e1020] hover:border-white/15"
      }`}
    >
      <span className="block text-sm font-medium text-white">{title}</span>
      <span className="mt-0.5 block text-xs text-[#A5A8C3]">{desc}</span>
    </button>
  );
}

// CodesPanel manages an experience's codes, in one of two places:
//  - mode "price" (the Codes section): % off and Free codes, shared or one
//    per guest, with use limits and dates;
//  - mode "access" ("Who can book? → A code per guest"): single-use codes
//    that only unlock booking.
// Entry is decided in "Who can book?" and price in Codes, so a host never
// sees the same unlock option twice. All kinds are rows in the coupons table.
export default function CodesPanel({
  eventId,
  hostId,
  isFree,
  codeGated,
  mode = "price",
}: Props) {
  const access = mode === "access";
  const effects = useMemo(
    () =>
      EFFECTS.filter((e) =>
        access ? e.key === "unlock" : e.key !== "unlock" && !isFree,
      ),
    [access, isFree],
  );

  const [codes, setCodes] = useState<CouponDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [listOpen, setListOpen] = useState(false);

  const [picked, setEffect] = useState<CodeEffect>(
    access ? "unlock" : "percent",
  );
  const [percent, setPercent] = useState("10");
  const [pickedHandout, setHandout] = useState<"shared" | "unique">("shared");
  // Entry codes here are always one per guest: the shared one is the passkey.
  const handout = access ? "unique" : pickedHandout;
  const [code, setCode] = useState("");
  const [totalUses, setTotalUses] = useState("");
  const [perGuest, setPerGuest] = useState("1");
  const [count, setCount] = useState("10");
  const [prefix, setPrefix] = useState("");
  const [from, setFrom] = useState("");
  const [until, setUntil] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastBatch, setLastBatch] = useState<CouponDTO[]>([]);
  // The picked effect, or the first one available if settings changed.
  const effect: CodeEffect = effects.some((e) => e.key === picked)
    ? picked
    : (effects[0]?.key ?? picked);

  const load = useCallback(async () => {
    try {
      const res = await getHostCoupons(hostId);
      setCodes(
        res.data.filter(
          (c) =>
            (c.event_id === eventId || c.event_id === null) &&
            (codeEffectOf(c) === "unlock") === access,
        ),
      );
    } catch {
      toast.error("Could not load codes");
    } finally {
      setLoading(false);
    }
  }, [hostId, eventId, access]);

  useEffect(() => {
    void load();
  }, [load]);

  const pct = Number(percent);
  const pctOk = Number.isInteger(pct) && pct >= 1 && pct <= 99;
  const optInt = (v: string) => (v.trim() ? Number(v) : null);
  const posIntOrBlank = (v: string) => {
    const n = optInt(v);
    return n === null || (Number.isInteger(n) && n >= 1);
  };

  const effectWords =
    effect === "free"
      ? "books this experience for ₹0"
      : effect === "percent"
        ? `takes ${pctOk ? pct : "?"}% off the tickets`
        : "lets a guest book at the normal price";

  const kindFields = {
    grants_free: effect === "free",
    discount_percent: effect === "percent" ? pct : null,
  };

  const create = async () => {
    if (effect === "percent" && !pctOk) {
      toast.error("Discount must be a whole number from 1 to 99");
      return;
    }
    if (from && until && from > until) {
      toast.error("The start date is after the end date");
      return;
    }
    if (handout === "shared") {
      if (!code.trim()) {
        toast.error("Enter the code guests will type");
        return;
      }
      if (!posIntOrBlank(totalUses) || !posIntOrBlank(perGuest)) {
        toast.error("Uses must be whole numbers of at least 1, or blank");
        return;
      }
      // A shared free code books for ₹0, so it must have a cap.
      if (effect === "free" && !totalUses.trim()) {
        toast.error("Set total uses for a shared free code");
        return;
      }
    } else {
      const n = Number(count);
      if (!Number.isInteger(n) || n < 1 || n > 500) {
        toast.error("Make between 1 and 500 codes at a time");
        return;
      }
    }
    if (effect === "free") {
      const n = handout === "shared" ? null : Number(count);
      const msg =
        handout === "shared"
          ? `Create ${code.trim().toUpperCase()}? Every guest who enters it books for ₹0, up to ${totalUses} bookings.`
          : `Create ${n} free code${n! > 1 ? "s" : ""}? Each one books one guest for ₹0.`;
      if (!window.confirm(msg)) return;
    }

    setSaving(true);
    try {
      if (handout === "shared") {
        await createCoupon({
          host_id: hostId,
          event_id: eventId,
          code: code.trim().toUpperCase(),
          ...kindFields,
          max_redemptions: optInt(totalUses),
          per_user_limit: optInt(perGuest),
          valid_from: startOfDay(from),
          valid_until: endOfDay(until),
          is_active: true,
        });
        toast.success("Code created");
        setCode("");
        setTotalUses("");
        setLastBatch([]);
      } else {
        const res = await createCouponsBatch({
          host_id: hostId,
          event_id: eventId,
          count: Number(count),
          prefix: prefix.trim() || undefined,
          ...kindFields,
          valid_from: startOfDay(from),
          valid_until: endOfDay(until),
        });
        setLastBatch(res.data);
        toast.success(`Created ${res.data.length} codes`);
      }
      setListOpen(true);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create the code");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (c: CouponDTO) => {
    try {
      // PUT is partial: only the active flag changes.
      await updateCoupon(c.id, {
        host_id: hostId,
        code: c.code,
        is_active: !c.is_active,
      });
      void load();
    } catch {
      toast.error("Could not update the code");
    }
  };

  const remove = async (c: CouponDTO) => {
    const msg =
      c.event_id === null
        ? `Delete ${c.code}? It works on all your experiences, so it stops working everywhere.`
        : `Delete ${c.code}?`;
    if (!window.confirm(msg)) return;
    try {
      await deleteCoupon(c.id, hostId);
      toast.success("Code deleted");
      void load();
    } catch {
      toast.error("Could not delete the code");
    }
  };

  const own = useMemo(
    () => codes.filter((c) => c.event_id === eventId),
    [codes, eventId],
  );

  const removeAll = async () => {
    if (own.length === 0) return;
    if (
      !window.confirm(
        `Delete all ${own.length} codes made for this experience? Codes for all your experiences stay.`,
      )
    )
      return;
    try {
      await Promise.all(own.map((c) => deleteCoupon(c.id, hostId)));
      toast.success("Codes deleted");
      setLastBatch([]);
      void load();
    } catch {
      toast.error("Could not delete every code");
      void load();
    }
  };

  const download = (rows: CouponDTO[], name: string) => {
    if (rows.length === 0) return;
    const blob = new Blob([codesToCsv(rows)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (effects.length === 0) {
    return (
      <p className="text-sm text-[#A5A8C3]">
        This experience is free, so there is nothing to take off the price.
        {codeGated
          ? " The codes guests use to get in are set in Who can book? above."
          : " To let only some people book, pick People with a code in Who can book? above."}
      </p>
    );
  }

  const total = codes.length;

  return (
    <div className="space-y-4">
      {/* Create */}
      <div className="space-y-4 rounded-xl border border-white/10 bg-[#121426] p-4">
        {access ? (
          <p className="text-sm text-[#A5A8C3]">
            Each code lets one guest book, once. They pay the normal price.
          </p>
        ) : (
          <>
            <div>
              <p className="mb-2 text-sm font-medium text-white">
                What does the code do?
              </p>
              <div
                className={`grid gap-2 ${effects.length === 3 ? "sm:grid-cols-3" : effects.length === 2 ? "sm:grid-cols-2" : ""}`}
                role="radiogroup"
                aria-label="What does the code do?"
              >
                {effects.map((e) => (
                  <Choice
                    key={e.key}
                    active={effect === e.key}
                    title={e.title}
                    desc={e.desc}
                    onClick={() => setEffect(e.key)}
                  />
                ))}
              </div>
              {effect === "percent" && (
                <label className="mt-3 flex items-center gap-2 text-sm text-white/80">
                  Discount
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={percent}
                    onChange={(e) => setPercent(e.target.value)}
                    className={`${input} w-20`}
                    aria-label="Discount percent"
                  />
                  % off
                </label>
              )}
              {codeGated && effect !== "unlock" && (
                <p className="mt-2 text-xs text-[#A5A8C3]">
                  It also lets the guest book this experience.
                </p>
              )}
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-white">
                How do you hand it out?
              </p>
              <div
                className="grid gap-2 sm:grid-cols-2"
                role="radiogroup"
                aria-label="How do you hand it out?"
              >
                <Choice
                  active={handout === "shared"}
                  title="One code to share"
                  desc="The same code for everyone you send it to."
                  onClick={() => setHandout("shared")}
                />
                <Choice
                  active={handout === "unique"}
                  title="A code per guest"
                  desc="Unique codes, each used once."
                  onClick={() => setHandout("unique")}
                />
              </div>
            </div>
          </>
        )}

        {handout === "shared" ? (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#A5A8C3]">
                Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. FRIENDS10"
                  className={`${input} min-w-0 flex-1 uppercase`}
                />
                <button
                  type="button"
                  onClick={() => setCode(genCode())}
                  className="rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/[0.04]"
                >
                  Generate
                </button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#A5A8C3]">
                  Total uses
                </label>
                <input
                  type="number"
                  min={1}
                  value={totalUses}
                  onChange={(e) => setTotalUses(e.target.value)}
                  placeholder={effect === "free" ? "Required" : "No limit"}
                  className={`${input} w-full`}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#A5A8C3]">
                  Uses per guest
                </label>
                <input
                  type="number"
                  min={1}
                  value={perGuest}
                  onChange={(e) => setPerGuest(e.target.value)}
                  placeholder="No limit"
                  className={`${input} w-full`}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#A5A8C3]">
                How many
              </label>
              <input
                type="number"
                min={1}
                max={500}
                value={count}
                onChange={(e) => setCount(e.target.value)}
                className={`${input} w-full`}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#A5A8C3]">
                Start with (optional)
              </label>
              <input
                type="text"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                placeholder="e.g. VIP"
                className={`${input} w-full uppercase`}
              />
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#A5A8C3]">
              Works from (optional)
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className={`${input} w-full`}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#A5A8C3]">
              Works until (optional)
            </label>
            <input
              type="date"
              value={until}
              onChange={(e) => setUntil(e.target.value)}
              className={`${input} w-full`}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void create()}
            disabled={saving}
            className="rounded-lg bg-[#A020F0] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#8A1AD0] disabled:opacity-50"
          >
            {saving
              ? "Creating…"
              : handout === "shared"
                ? "Create code"
                : `Create ${Number(count) > 0 ? count : ""} codes`}
          </button>
          <span
            className={`text-xs ${effect === "free" ? "text-amber-300" : "text-[#A5A8C3]"}`}
          >
            {handout === "shared" ? "This code" : "Each code"} {effectWords}.
          </span>
        </div>

        {lastBatch.length > 0 && (
          <button
            type="button"
            onClick={() =>
              download(lastBatch, `codes-${lastBatch.length}-${eventId}.csv`)
            }
            className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"
          >
            <FiDownload size={15} /> Download the {lastBatch.length} codes you
            just made
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <p className="text-sm text-[#777B98]">Loading codes…</p>
      ) : total === 0 ? (
        <p className="text-sm text-[#777B98]">No codes yet.</p>
      ) : (
        <div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-expanded={listOpen}
              onClick={() => setListOpen((v) => !v)}
              className="flex flex-1 items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/[0.04]"
            >
              <span>
                {total} code{total > 1 ? "s" : ""}
              </span>
              <FiChevronDown
                size={16}
                className={`transition-transform ${listOpen ? "rotate-180" : ""}`}
              />
            </button>
            {codes.length > 0 && (
              <button
                type="button"
                onClick={() => download(codes, `codes-${eventId}.csv`)}
                className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/[0.04]"
              >
                <FiDownload size={15} /> CSV
              </button>
            )}
          </div>

          {listOpen && (
            <div className="mt-2 overflow-hidden rounded-lg border border-white/10">
              <div className="max-h-72 overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-[#121426]">
                    <tr className="text-xs tracking-wide text-[#777B98] uppercase">
                      <th className="px-3 py-2 font-medium">Code</th>
                      <th className="px-3 py-2 font-medium">Does</th>
                      <th className="px-3 py-2 font-medium">Used</th>
                      <th className="hidden px-3 py-2 font-medium sm:table-cell">
                        Works
                      </th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {codes.map((c) => (
                      <tr key={c.id} className="border-t border-white/10">
                        <td className="px-3 py-2 font-semibold text-white">
                          {c.code}
                          {c.event_id === null && (
                            <span className="block text-xs font-normal text-[#777B98]">
                              All your experiences
                            </span>
                          )}
                        </td>
                        <td
                          className={`px-3 py-2 ${codeEffectOf(c) === "unlock" ? "text-[#A5A8C3]" : "text-[#D8B4FE]"}`}
                        >
                          {codeEffectLabel(c)}
                        </td>
                        <td className="px-3 py-2 text-[#A5A8C3]">
                          {usedLabel(c)}
                        </td>
                        <td className="hidden px-3 py-2 text-[#A5A8C3] sm:table-cell">
                          {validLabel(c)}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => void toggleActive(c)}
                            title={c.is_active ? "Pause" : "Turn back on"}
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              c.is_active
                                ? "bg-green-500/15 text-green-300"
                                : "bg-white/[0.06] text-[#A5A8C3]"
                            }`}
                          >
                            {c.is_active ? "Active" : "Paused"}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => void remove(c)}
                            className="text-[#777B98] hover:text-red-400"
                            aria-label={`Delete ${c.code}`}
                          >
                            <FiTrash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {own.length > 1 && (
                <div className="border-t border-white/10 px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => void removeAll()}
                    className="text-xs font-medium text-red-300 hover:text-red-200"
                  >
                    Delete all {own.length} codes for this experience
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
