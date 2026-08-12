"use client";

import { useEffect, useState, useMemo, type ReactNode } from "react";
import Link from "next/link";
import {
  FiArrowDownLeft,
  FiArrowUpRight,
  FiClock,
  FiCreditCard,
  FiRotateCcw,
  FiXCircle,
  FiPlus,
  FiTrendingUp,
  FiTrendingDown,
} from "react-icons/fi";

import * as components from "~/components";
import Breadcrumb from "~/components/Breadcrumb";
import TopUpModal from "~/components/wallet/TopUpModal";
import {
  useWalletBalance,
  useWalletTransactions,
  useMyProfile,
} from "~/hooks/useApi";
import type { PaymentDTO } from "~/lib/api";

// Human-friendly description of a payment row for the wallet history list.
// Each row carries: a title, a subtitle (date / reference / extra context),
// the signed amount (+/- in paise — 0 when no money actually moved, e.g.
// failed/reversed), a status badge, an icon, and an optional plain-English
// note (used to explain failed source refunds, refund destinations, etc.).
interface TxnDisplay {
  title: string;
  subtitle: string;
  note?: string;
  amountSigned: number; // cents; + inflow, − outflow, 0 = no money moved
  statusLabel: string;
  statusTone: "success" | "pending" | "failed" | "neutral";
  icon: ReactNode;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatRupees(cents: number): string {
  const rupees = Math.abs(cents) / 100;
  return `₹${rupees.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function describePayment(p: PaymentDTO): TxnDisplay {
  const failed = p.status === "failed" || p.status === "reversed";
  const pending = p.status === "pending" || p.status === "processing";

  // status badge
  const statusLabel = failed
    ? p.status === "failed"
      ? "Failed"
      : "Reversed"
    : pending
      ? "Processing"
      : "Completed";
  const statusTone: TxnDisplay["statusTone"] = failed
    ? "failed"
    : pending
      ? "pending"
      : "success";

  // common subtitle pieces
  const dateStr = formatDateTime(p.created_at);
  const ref = p.display_reference ? ` · ${p.display_reference}` : "";

  // Effective sign — failed/reversed payments did not move money, so 0.
  const noMovement = failed;

  switch (p.type) {
    case "topup": {
      return {
        title: "Wallet top-up",
        subtitle: `${dateStr}${ref}`,
        amountSigned: noMovement ? 0 : p.amount_cents,
        statusLabel,
        statusTone,
        icon: <FiArrowDownLeft className="text-green-600" size={18} />,
      };
    }
    case "booking": {
      const reversed = p.status === "reversed";
      return {
        title: reversed ? "Booking reversed" : "Booked experience",
        subtitle: `${dateStr}${ref}`,
        amountSigned: noMovement ? 0 : -p.amount_cents,
        statusLabel,
        statusTone,
        icon: reversed ? (
          <FiRotateCcw className="text-gray-500" size={18} />
        ) : (
          <FiArrowUpRight className="text-rose-600" size={18} />
        ),
      };
    }
    case "refund": {
      const toSource = !!p.refund_of_payment_id;
      const amountRupees = formatRupees(p.amount_cents);

      if (!toSource) {
        // Wallet refund — money stays in this wallet (the F4 cancellation path).
        return {
          title: "Refund · added to wallet",
          subtitle: `${dateStr}${ref}`,
          note: "Money is in your wallet — use it for another booking, or request a refund to card from your bookings list.",
          amountSigned: noMovement ? 0 : p.amount_cents,
          statusLabel,
          statusTone,
          icon: <FiArrowDownLeft className="text-green-600" size={18} />,
        };
      }

      // Source refund — money goes out of the wallet to the original card/UPI.
      if (p.status === "completed") {
        return {
          title: "Refund · sent to card / UPI",
          subtitle: `${dateStr}${ref}`,
          note: `${amountRupees} sent back to your original payment method. May take 5–7 working days to appear.`,
          amountSigned: -p.amount_cents,
          statusLabel,
          statusTone,
          icon: <FiCreditCard className="text-rose-600" size={18} />,
        };
      }
      if (p.status === "failed" || p.status === "reversed") {
        return {
          title: "Refund to card · couldn't process",
          subtitle: `${dateStr}${ref}`,
          note: `We tried to send ${amountRupees} back to your card, but the payment gateway couldn't process it. Your ${amountRupees} wallet refund (above) is still in your wallet — use it for another booking, or try again later.`,
          amountSigned: 0, // no money actually moved
          statusLabel,
          statusTone,
          icon: <FiCreditCard className="text-gray-400" size={18} />,
        };
      }
      // pending / processing
      return {
        title: "Refund to card · processing",
        subtitle: `${dateStr}${ref}`,
        note: `${amountRupees} is being transferred from your wallet to your original payment method. Usually arrives in 5–7 working days.`,
        amountSigned: -p.amount_cents,
        statusLabel,
        statusTone,
        icon: <FiCreditCard className="text-amber-500" size={18} />,
      };
    }
    case "withdrawal":
    case "payout":
      return {
        title: "Withdrawal",
        subtitle: `${dateStr}${ref}`,
        amountSigned: noMovement ? 0 : -p.amount_cents,
        statusLabel,
        statusTone,
        icon: <FiArrowUpRight className="text-rose-600" size={18} />,
      };
    default:
      return {
        title: p.type,
        subtitle: `${dateStr}${ref}`,
        amountSigned: noMovement ? 0 : p.amount_cents,
        statusLabel,
        statusTone,
        icon: <FiClock className="text-gray-400" size={18} />,
      };
  }
}

function StatusBadge({
  tone,
  children,
}: {
  tone: TxnDisplay["statusTone"];
  children: ReactNode;
}) {
  const classes =
    tone === "success"
      ? "bg-green-100 text-green-700"
      : tone === "pending"
        ? "bg-amber-100 text-amber-700"
        : tone === "failed"
          ? "bg-gray-100 text-gray-500"
          : "bg-gray-100 text-gray-600";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${classes}`}
    >
      {children}
    </span>
  );
}

export default function WalletPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [showTopUp, setShowTopUp] = useState(false);
  useEffect(() => {
    setUserId(localStorage.getItem("msm_user_id"));
  }, []);

  const balanceQuery = useWalletBalance(userId);
  const txnsQuery = useWalletTransactions(userId);
  const profileQuery = useMyProfile(userId);

  // Lightweight stats above the list — money in / money out / pending.
  // MUST be declared before any early return so hook order stays stable
  // across renders (React rules-of-hooks).
  const txnsForStats = txnsQuery.data ?? [];
  const stats = useMemo(() => {
    let inCents = 0;
    let outCents = 0;
    let pendingCount = 0;
    for (const p of txnsForStats) {
      const d = describePayment(p);
      if (d.statusTone === "pending") pendingCount += 1;
      if (d.amountSigned > 0) inCents += d.amountSigned;
      if (d.amountSigned < 0) outCents += -d.amountSigned;
    }
    return { inCents, outCents, pendingCount };
  }, [txnsForStats]);

  if (!userId) {
    return (
      <main className="min-h-screen bg-white">
        <components.Navbar />
        <div className="site-x mx-auto w-full max-w-[1120px] py-10">
          <Breadcrumb
            items={[{ label: "Home", href: "/" }, { label: "Wallet" }]}
            className="mb-6"
          />
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-10 text-center">
            <h1 className="mb-2 text-2xl font-bold">Wallet</h1>
            <p className="text-gray-500">
              Please{" "}
              <Link href="/login" className="text-rose-600 underline">
                log in
              </Link>{" "}
              to see your wallet balance and transaction history.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const balanceCents = balanceQuery.data?.balance_cents ?? 0;
  const txns = txnsForStats;

  return (
    <main className="min-h-screen bg-white">
      <components.Navbar />

      <div className="site-x mx-auto w-full max-w-[1120px] py-8">
        <Breadcrumb
          items={[{ label: "Home", href: "/" }, { label: "Wallet" }]}
          className="mb-6"
        />

        {/* Page header */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Wallet</h1>
            <p className="mt-2 text-gray-600">
              Your balance and every top-up, booking, and refund — in one place.
            </p>
          </div>
          <Link
            href="/activities"
            className="text-sm font-medium text-rose-600 hover:underline"
          >
            View my bookings →
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Balance card (spans 2 cols on desktop) */}
          <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 via-pink-600 to-fuchsia-600 p-7 text-white shadow-lg lg:col-span-2">
            {/* Decorative blob */}
            <div className="pointer-events-none absolute -top-12 -right-12 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
            <div className="relative">
              <p className="text-xs font-semibold tracking-widest text-rose-100/90 uppercase">
                Available balance
              </p>
              <p className="mt-2 text-5xl leading-none font-bold">
                {balanceQuery.isLoading ? "…" : formatRupees(balanceCents)}
              </p>
              <p className="mt-3 text-sm text-rose-100/80">
                Use this credit to book any experience. Top up anytime.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setShowTopUp(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-sm font-medium backdrop-blur transition hover:bg-white/25"
                >
                  <FiPlus className="h-4 w-4" />
                  Top up
                </button>
                <Link
                  href="/activities"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 px-3 py-2 text-sm font-medium transition hover:bg-white/10"
                >
                  Book an experience
                </Link>
              </div>
            </div>
          </section>

          {/* Stats card */}
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                <FiTrendingUp className="text-green-500" /> Money in
              </div>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatRupees(stats.inCents)}
              </p>
              <p className="text-[11px] text-gray-400">Top-ups + refunds</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                <FiTrendingDown className="text-rose-500" /> Money out
              </div>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatRupees(stats.outCents)}
              </p>
              <p className="text-[11px] text-gray-400">
                Bookings + refunds to card
              </p>
            </div>
          </section>
        </div>

        {/* Transactions */}
        <section className="mt-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-wide text-gray-500 uppercase">
              Transactions
            </h2>
            {stats.pendingCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                <FiClock className="h-3 w-3" />
                {stats.pendingCount} processing
              </span>
            )}
          </div>

          {txnsQuery.isLoading && (
            <p className="rounded-xl border border-gray-100 bg-gray-50 p-8 text-center text-sm text-gray-500">
              Loading transactions…
            </p>
          )}
          {!txnsQuery.isLoading && txns.length === 0 && (
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-10 text-center">
              <p className="text-base font-semibold text-gray-700">
                No transactions yet
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Top up your wallet or book an experience to get started.
              </p>
            </div>
          )}
          {!txnsQuery.isLoading && txns.length > 0 && (
            <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              {txns.map((p) => {
                const d = describePayment(p);
                const amountColor =
                  d.amountSigned > 0
                    ? "text-green-600"
                    : d.amountSigned < 0
                      ? "text-rose-600"
                      : "text-gray-400";
                const amountText =
                  d.amountSigned === 0
                    ? formatRupees(p.amount_cents)
                    : (d.amountSigned > 0 ? "+" : "−") +
                      formatRupees(d.amountSigned);
                return (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-gray-50 sm:px-5"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-50 ring-1 ring-gray-100">
                      {d.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold text-gray-900">
                          {d.title}
                        </span>
                        <StatusBadge tone={d.statusTone}>
                          {d.statusLabel}
                        </StatusBadge>
                      </div>
                      <p className="truncate text-xs text-gray-500">
                        {d.subtitle}
                      </p>
                      {d.note && (
                        <p
                          className="mt-1 text-xs leading-relaxed text-gray-500"
                          title={p.last_error ?? undefined}
                        >
                          {d.note}
                        </p>
                      )}
                    </div>
                    <div
                      className={`shrink-0 text-right text-sm font-semibold ${amountColor}`}
                    >
                      {amountText}
                      {d.amountSigned === 0 && (
                        <FiXCircle
                          className="ml-1 inline text-gray-300"
                          size={12}
                        />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Top-up modal — opened from the balance-card "Top up" button. */}
      {userId && (
        <TopUpModal
          isOpen={showTopUp}
          onClose={() => setShowTopUp(false)}
          userId={userId}
          currentBalance={balanceCents}
          userName={profileQuery.data?.name}
          userEmail={profileQuery.data?.email}
          userPhone={profileQuery.data?.phn_number}
        />
      )}
    </main>
  );
}
