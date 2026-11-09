"use client";

import { useState } from "react";
import Link from "next/link";
import { LuWallet, LuPlus, LuLoader2, LuHistory } from "react-icons/lu";
import { useWalletBalance } from "~/hooks/useApi";
import TopUpModal from "./TopUpModal";

interface WalletDisplayProps {
  userId: string | null;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  variant?: "navbar" | "sidebar" | "compact";
  /** Dark palette for the sidebar variant (redesigned pages). */
  dark?: boolean;
}

export default function WalletDisplay({
  userId,
  userName,
  userEmail,
  userPhone,
  variant = "navbar",
  dark = false,
}: WalletDisplayProps) {
  const [showTopUp, setShowTopUp] = useState(false);

  const walletQuery = useWalletBalance(userId);
  const wallet = walletQuery.data;
  const isLoading = walletQuery.isLoading;
  const error = walletQuery.error;

  const formatCurrency = (paise: number) => {
    return `₹${(paise / 100).toLocaleString("en-IN")}`;
  };

  const balance = wallet?.balance_cents ?? 0;

  if (!userId) return null;

  // Compact variant for navbar
  if (variant === "compact") {
    return (
      <>
        <button
          onClick={() => setShowTopUp(true)}
          className="flex items-center gap-2 rounded-full bg-[#e6f8ff] px-3 py-1.5 text-sm font-semibold text-[#0094CA] transition hover:bg-[#d1f1ff]"
        >
          <LuWallet className="h-4 w-4" />
          {isLoading ? (
            <LuLoader2 className="h-4 w-4 animate-spin" />
          ) : (
            formatCurrency(balance)
          )}
          <LuPlus className="h-3.5 w-3.5" />
        </button>

        <TopUpModal
          isOpen={showTopUp}
          onClose={() => setShowTopUp(false)}
          userId={userId}
          currentBalance={balance}
          userName={userName}
          userEmail={userEmail}
          userPhone={userPhone}
        />
      </>
    );
  }

  // Navbar variant
  if (variant === "navbar") {
    return (
      <>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowTopUp(true)}
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 transition hover:border-[#0094CA] hover:bg-[#e6f8ff]"
          >
            <LuWallet className="h-5 w-5 text-[#0094CA]" />
            <div className="text-left">
              <p className="text-xs text-gray-500">Balance</p>
              {isLoading ? (
                <LuLoader2 className="h-4 w-4 animate-spin text-gray-400" />
              ) : (
                <p className="text-sm font-bold text-gray-900">
                  {formatCurrency(balance)}
                </p>
              )}
            </div>
          </button>
          <button
            onClick={() => setShowTopUp(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0094CA] text-white transition hover:bg-[#007dab]"
            title="Add Money"
          >
            <LuPlus className="h-5 w-5" />
          </button>
        </div>

        <TopUpModal
          isOpen={showTopUp}
          onClose={() => setShowTopUp(false)}
          userId={userId}
          currentBalance={balance}
          userName={userName}
          userEmail={userEmail}
          userPhone={userPhone}
        />
      </>
    );
  }

  // Sidebar variant (for profile panel)
  return (
    <>
      <div
        className={`${dark ? "rounded-2xl border border-white/[0.08] bg-[#131328] p-4" : "rounded-xl border border-gray-200 bg-white p-4"}`}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full ${dark ? "bg-[#9B30FF]/15" : "bg-[#e6f8ff]"}`}
            >
              <LuWallet
                className={`h-4 w-4 ${dark ? "text-[#D8B4FE]" : "text-[#0094CA]"}`}
              />
            </div>
            <span
              className={`text-sm font-medium ${dark ? "text-white/80" : "text-gray-700"}`}
            >
              Wallet Balance
            </span>
          </div>
        </div>

        <div className="mb-3">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <LuLoader2
                className={`h-5 w-5 animate-spin ${dark ? "text-white/45" : "text-gray-400"}`}
              />
              <span
                className={`text-sm ${dark ? "text-white/45" : "text-gray-400"}`}
              >
                Loading...
              </span>
            </div>
          ) : error ? (
            <p
              className={`text-sm ${dark ? "text-white/55" : "text-gray-500"}`}
            >
              Unable to load
            </p>
          ) : (
            <p
              className={`text-2xl font-bold ${dark ? "text-white" : "text-gray-900"}`}
            >
              {formatCurrency(balance)}
            </p>
          )}
        </div>

        <button
          onClick={() => setShowTopUp(true)}
          className={`flex w-full items-center justify-center gap-2 rounded-lg ${dark ? "bg-gradient-to-r from-[#7038F5] to-[#B724EA] py-2.5 text-sm font-semibold text-white transition hover:brightness-110" : "bg-[#0094CA] py-2.5 text-sm font-semibold text-white transition hover:bg-[#007dab]"}`}
        >
          <LuPlus className="h-4 w-4" />
          Add Money
        </button>

        <Link
          href="/wallet"
          className={`mt-2 flex w-full items-center justify-center gap-2 ${dark ? "rounded-lg border border-white/10 py-2 text-xs font-medium text-white/70 transition hover:bg-white/5" : "rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-50"}`}
        >
          <LuHistory className="h-3.5 w-3.5" />
          View transactions
        </Link>
      </div>

      <TopUpModal
        isOpen={showTopUp}
        onClose={() => setShowTopUp(false)}
        userId={userId}
        currentBalance={balance}
        userName={userName}
        userEmail={userEmail}
        userPhone={userPhone}
      />
    </>
  );
}
