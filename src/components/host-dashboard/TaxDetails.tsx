"use client";

/**
 * Host tax details for the Earnings page (PRD: Payout and tax spec).
 *
 * Myslotmate pays GST on its own guest platform fee, so nothing here is a
 * Myslotmate charge. The only deductions a host can see are the ones the
 * government requires us to make for them, and both are credited back:
 *   - GST TCS (Section 52 CGST Act), 0.5%, only if the host has a GSTIN
 *   - Income-tax TDS (Section 194-O), 0.1%, only for companies/firms, or
 *     individuals/HUFs past ₹5 lakh of gross sales in the financial year
 * Rates are applied by the backend; this file only collects PAN/GSTIN and
 * explains the numbers.
 */

import { useState } from "react";
import { FiAlertCircle, FiEdit2, FiInfo } from "react-icons/fi";
import { useUpdateHostTaxProfile } from "~/hooks/useApi";
import type {
  HostEarningsDTO,
  HostEntityType,
  HostTaxProfileDTO,
  PayoutBreakdownDTO,
} from "~/lib/api";

// ─── Rules shared with the backend ───────────────────────────────────────────

const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GSTIN_RE = /^[0-9]{2}[A-Z0-9]{10}[0-9A-Z]{3}$/;
/** ₹5,00,000 in paise — used only when the backend doesn't send a threshold. */
const DEFAULT_TDS_THRESHOLD_CENTS = 50_000_000;

export const isValidPan = (pan: string) => PAN_RE.test(pan);

/** A GSTIN embeds the holder's PAN in characters 3–12. */
export const isValidGstin = (gstin: string, pan?: string) =>
  GSTIN_RE.test(gstin) && (!pan || gstin.slice(2, 12) === pan);

const ENTITY_LABELS: Record<HostEntityType, string> = {
  individual: "Individual",
  huf: "Hindu Undivided Family (HUF)",
  company: "Company",
  firm: "Partnership firm",
  llp: "LLP",
  other: "Other",
};

/** Individuals and HUFs get the ₹5 lakh TDS threshold; everyone else doesn't. */
const hasTdsThreshold = (t: HostEntityType) =>
  t === "individual" || t === "huf";

/** "FY 2026–27" for any date from 1 Apr 2026 to 31 Mar 2027. */
export function financialYearLabel(d = new Date()) {
  const start = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return `FY ${start}–${String(start + 1).slice(2)}`;
}

/** Whether the host must add a PAN before withdrawing. */
export const needsTaxProfile = (p: HostTaxProfileDTO | null | undefined) =>
  !p?.pan_masked;

// ─── Small pieces ────────────────────────────────────────────────────────────

function Tip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex align-middle">
      <FiInfo
        className="h-3.5 w-3.5 text-[#777B98]"
        aria-label={text}
        tabIndex={0}
      />
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-64 -translate-x-1/2 rounded-lg border border-white/10 bg-[#1B1E33] px-3 py-2 text-[11px] leading-4 font-normal text-[#C9CBE0] shadow-xl group-focus-within:block group-hover:block"
      >
        {text}
      </span>
    </span>
  );
}

export const TCS_TIP =
  "0.5% GST collected at source, required by Section 52 of the CGST Act. It's credited to your GSTIN; claim it in your GST return.";
export const TDS_TIP =
  "0.1% income tax deducted at source under Section 194-O. It's credited to your PAN; you'll see it in Form 26AS and get Form 16A.";

// ─── Tax details card ────────────────────────────────────────────────────────

export function TaxDetailsCard({
  profile,
  earnings,
  fmt,
  onEdit,
}: {
  profile: HostTaxProfileDTO | null | undefined;
  earnings: HostEarningsDTO | undefined;
  fmt: (cents: number) => string;
  onEdit: () => void;
}) {
  const fy = financialYearLabel();
  const tcs = earnings?.tcs_fy_cents;
  const tds = earnings?.tds_fy_cents;
  const gross = earnings?.fy_gross_cents;
  const threshold =
    earnings?.tds_threshold_cents ?? DEFAULT_TDS_THRESHOLD_CENTS;
  const entity = profile?.entity_type ?? "individual";
  const showProgress =
    gross !== undefined && hasTdsThreshold(entity) && gross < threshold;
  const progressPct = gross ? Math.min(100, (gross / threshold) * 100) : 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#121426] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Tax details</h3>
          <p className="mt-1 text-xs text-[#A5A8C3]">
            Needed by law to send your earnings. Myslotmate never charges you a
            fee for hosting.
          </p>
        </div>
        {profile?.pan_masked && (
          <button
            type="button"
            onClick={onEdit}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-semibold text-[#D8B4FE] transition hover:bg-white/[0.04]"
          >
            <FiEdit2 className="h-3.5 w-3.5" /> Edit
          </button>
        )}
      </div>

      {needsTaxProfile(profile) ? (
        <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="flex items-center gap-1.5 text-sm font-medium text-amber-200">
            <FiAlertCircle className="h-4 w-4 shrink-0" />
            Add your PAN to withdraw
          </p>
          <p className="mt-1 text-xs text-amber-100/70">
            Online marketplaces must record a PAN for every payout. Add your
            GSTIN too if you&apos;re GST-registered.
          </p>
          <button
            type="button"
            onClick={onEdit}
            className="mt-3 rounded-lg bg-[#A020F0] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#8A1AD0]"
          >
            Add tax details
          </button>
        </div>
      ) : (
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-[11px] text-[#777B98]">PAN</dt>
            <dd className="font-medium text-white">{profile?.pan_masked}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-[#777B98]">GSTIN</dt>
            <dd className="font-medium text-white">
              {profile?.gstin ?? "Not registered"}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-[11px] text-[#777B98]">Registered as</dt>
            <dd className="font-medium text-white">{ENTITY_LABELS[entity]}</dd>
          </div>
        </dl>
      )}

      {/* Tax credited this year — only once the backend reports it. */}
      {(tcs !== undefined || tds !== undefined) && (
        <div className="mt-5 border-t border-white/10 pt-4">
          <p className="text-xs font-semibold tracking-wide text-[#A5A8C3] uppercase">
            Tax credited to you · {fy}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-white/[0.04] p-3">
              <p className="flex items-center gap-1.5 text-[11px] text-[#A5A8C3]">
                GST TCS <Tip text={TCS_TIP} />
              </p>
              <p className="mt-1 text-base font-semibold text-white">
                {fmt(tcs ?? 0)}
              </p>
            </div>
            <div className="rounded-lg bg-white/[0.04] p-3">
              <p className="flex items-center gap-1.5 text-[11px] text-[#A5A8C3]">
                Income tax TDS <Tip text={TDS_TIP} />
              </p>
              <p className="mt-1 text-base font-semibold text-white">
                {fmt(tds ?? 0)}
              </p>
            </div>
          </div>
        </div>
      )}

      {showProgress && (
        <div className="mt-4">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-[#A020F0]"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-[#A5A8C3]">
            {fmt(gross)} of {fmt(threshold)} before income tax TDS starts this
            year.
          </p>
        </div>
      )}

      <p className="mt-4 text-[11px] leading-4 text-[#777B98]">
        Myslotmate pays GST on its own platform fee. TCS applies only if
        you&apos;re GST-registered; TDS only for businesses or once you sell
        over ₹5 lakh in a year. Both are credited back to you.
      </p>
    </div>
  );
}

// ─── Tax profile form (rendered inside the page's Modal) ─────────────────────

export function TaxProfileForm({
  hostId,
  idToken,
  profile,
  reason,
  onSaved,
  onCancel,
}: {
  hostId: string;
  idToken: string | null;
  profile: HostTaxProfileDTO | null | undefined;
  /** Shown above the form, e.g. why we're asking right now. */
  reason?: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [entity, setEntity] = useState<HostEntityType>(
    profile?.entity_type ?? "individual",
  );
  // The saved PAN comes back masked, so the host re-enters it to change it.
  const [pan, setPan] = useState("");
  const [panName, setPanName] = useState(profile?.pan_name ?? "");
  const [gstin, setGstin] = useState(profile?.gstin ?? "");
  const [error, setError] = useState<string | null>(null);
  const save = useUpdateHostTaxProfile(idToken);

  const submit = async () => {
    setError(null);
    const p = pan.trim().toUpperCase();
    const g = gstin.trim().toUpperCase();
    if (!isValidPan(p)) {
      setError("Enter a valid 10-character PAN, e.g. ABCDE1234F.");
      return;
    }
    if (!panName.trim()) {
      setError("Enter your name exactly as it appears on your PAN.");
      return;
    }
    if (g && !isValidGstin(g, p)) {
      setError(
        "That GSTIN doesn't look right. It's 15 characters and contains your PAN.",
      );
      return;
    }
    try {
      await save.mutateAsync({
        hostId,
        body: {
          entity_type: entity,
          pan: p,
          pan_name: panName.trim(),
          gstin: g || null,
        },
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save tax details.");
    }
  };

  const inputCls =
    "w-full rounded-lg border border-white/10 bg-transparent px-3 py-2.5 text-sm text-white placeholder-[#777B98] uppercase placeholder:normal-case transition outline-none focus:border-[#A020F0] focus:ring-2 focus:ring-[#A020F0]/20";
  const labelCls = "mb-1.5 block text-xs font-medium text-[#A5A8C3]";

  return (
    <div className="space-y-4">
      <p className="rounded-lg bg-white/[0.04] px-3 py-2.5 text-xs leading-5 text-[#A5A8C3]">
        {reason ??
          "We need your PAN to send your earnings. It's required by law for online marketplaces."}{" "}
        Add your GSTIN if you&apos;re GST-registered.
      </p>

      <div>
        <label htmlFor="tax-entity" className={labelCls}>
          Registered as
        </label>
        <select
          id="tax-entity"
          value={entity}
          onChange={(e) => setEntity(e.target.value as HostEntityType)}
          className="w-full rounded-lg border border-white/10 bg-[#121426] px-3 py-2.5 text-sm text-white outline-none focus:border-[#A020F0] focus:ring-2 focus:ring-[#A020F0]/20"
        >
          {(Object.keys(ENTITY_LABELS) as HostEntityType[]).map((k) => (
            <option key={k} value={k}>
              {ENTITY_LABELS[k]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="tax-pan" className={labelCls}>
          PAN
        </label>
        <input
          id="tax-pan"
          value={pan}
          onChange={(e) => setPan(e.target.value.toUpperCase().slice(0, 10))}
          placeholder={profile?.pan_masked ?? "ABCDE1234F"}
          autoComplete="off"
          className={inputCls}
        />
        {profile?.pan_masked && (
          <p className="mt-1 text-[11px] text-[#777B98]">
            Saved: {profile.pan_masked}. Re-enter your PAN to update it.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="tax-pan-name" className={labelCls}>
          Name on PAN
        </label>
        <input
          id="tax-pan-name"
          value={panName}
          onChange={(e) => setPanName(e.target.value)}
          placeholder="As printed on your PAN card"
          className={inputCls.replace("uppercase", "")}
        />
      </div>

      <div>
        <label htmlFor="tax-gstin" className={labelCls}>
          GSTIN <span className="font-normal text-[#777B98]">(optional)</span>
        </label>
        <input
          id="tax-gstin"
          value={gstin}
          onChange={(e) => setGstin(e.target.value.toUpperCase().slice(0, 15))}
          placeholder="Only if you're GST-registered"
          autoComplete="off"
          className={inputCls}
        />
        <p className="mt-1 text-[11px] text-[#777B98]">
          With a GSTIN, 0.5% GST TCS is deducted from payouts and credited to
          your GST ledger.
        </p>
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-300">
          <FiAlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
        </p>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium text-[#A5A8C3] transition hover:bg-white/[0.04]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={save.isPending}
          className="flex-1 rounded-lg bg-[#A020F0] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8A1AD0] disabled:opacity-60"
        >
          {save.isPending ? "Saving…" : "Save tax details"}
        </button>
      </div>
    </div>
  );
}

// ─── Payout line items ───────────────────────────────────────────────────────

/** Expanded view of one payout: how the amount paid was arrived at. */
export function PayoutBreakdownList({
  b,
  fmt,
}: {
  b: PayoutBreakdownDTO;
  fmt: (cents: number) => string;
}) {
  const row = (label: React.ReactNode, value: string, strong = false) => (
    <div className="flex items-center justify-between gap-4">
      <span
        className={`flex items-center gap-1.5 ${strong ? "font-medium text-white" : "text-[#A5A8C3]"}`}
      >
        {label}
      </span>
      <span className={strong ? "font-semibold text-white" : "text-[#C9CBE0]"}>
        {value}
      </span>
    </div>
  );
  return (
    <div className="space-y-2 text-xs">
      {row("Earnings", fmt(b.earnings_cents))}
      {b.boost_commission_cents > 0 &&
        row("Marketing Boost", `−${fmt(b.boost_commission_cents)}`)}
      {(b.ad_cost_recovery_cents ?? 0) > 0 &&
        row(
          "Ad cost recovery · cancelled Boosted event",
          `−${fmt(b.ad_cost_recovery_cents!)}`,
        )}
      {(b.recovery_cents ?? 0) > 0 &&
        row("Owed from an earlier cancellation", `−${fmt(b.recovery_cents!)}`)}
      {(b.held_cents ?? 0) > 0 &&
        row("Held until after the event (50%)", `−${fmt(b.held_cents!)}`)}
      {b.tcs_cents > 0 &&
        row(
          <>
            GST TCS · credited to your GSTIN <Tip text={TCS_TIP} />
          </>,
          `−${fmt(b.tcs_cents)}`,
        )}
      {b.tds_cents > 0 &&
        row(
          <>
            Income tax TDS · credited to your PAN <Tip text={TDS_TIP} />
          </>,
          `−${fmt(b.tds_cents)}`,
        )}
      <div className="border-t border-white/10 pt-2">
        {row("Paid to your bank", fmt(b.paid_cents), true)}
      </div>
      <p className="text-[11px] text-[#777B98]">
        Myslotmate pays GST on its own platform fee. Nothing here is a
        Myslotmate fee unless it says Marketing Boost or Ad cost recovery. Held
        amounts are yours and are paid after the event.
      </p>
    </div>
  );
}
