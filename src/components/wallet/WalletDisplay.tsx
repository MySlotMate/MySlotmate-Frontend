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
          className="flex items-center gap-2 rounded-full bg-[#241333] px-3 py-1.5 text-sm font-semibold text-[#D8B4FE] transition hover:bg-[#2E1745]"
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
            className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 transition hover:border-[#A020F0] hover:bg-[#241333]"
          >
            <LuWallet className="h-5 w-5 text-[#D8B4FE]" />
            <div className="text-left">
              <p className="text-xs text-[#A5A8C3]">Balance</p>
              {isLoading ? (
                <LuLoader2 className="h-4 w-4 animate-spin text-[#777B98]" />
              ) : (
                <p className="text-sm font-bold text-white">
                  {formatCurrency(balance)}
                </p>
              )}
            </div>
          </button>
          <button
            onClick={() => setShowTopUp(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#A020F0] text-white transition hover:bg-[#8A1AD0]"
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
        className={`${dark ? "rounded-2xl border border-white/[0.08] bg-[#131328] p-4" : "rounded-xl border border-white/10 bg-[#121426] p-4"}`}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full ${dark ? "bg-[#9B30FF]/15" : "bg-[#241333]"}`}
            >
              <LuWallet
                className={`h-4 w-4 ${dark ? "text-[#D8B4FE]" : "text-[#D8B4FE]"}`}
              />
            </div>
            <span
              className={`text-sm font-medium ${dark ? "text-white/80" : "text-white/80"}`}
            >
              Wallet Balance
            </span>
          </div>
        </div>

        <div className="mb-3">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <LuLoader2
                className={`h-5 w-5 animate-spin ${dark ? "text-white/45" : "text-[#777B98]"}`}
              />
              <span
                className={`text-sm ${dark ? "text-white/45" : "text-[#777B98]"}`}
              >
                Loading...
              </span>
            </div>
          ) : error ? (
            <p
              className={`text-sm ${dark ? "text-white/55" : "text-[#A5A8C3]"}`}
            >
              Unable to load
            </p>
          ) : (
            <p
              className={`text-2xl font-bold ${dark ? "text-white" : "text-white"}`}
            >
              {formatCurrency(balance)}
            </p>
          )}
        </div>

        <button
          onClick={() => setShowTopUp(true)}
          className={`flex w-full items-center justify-center gap-2 rounded-lg ${dark ? "bg-gradient-to-r from-[#7038F5] to-[#B724EA] py-2.5 text-sm font-semibold text-white transition hover:brightness-110" : "bg-[#A020F0] py-2.5 text-sm font-semibold text-white transition hover:bg-[#8A1AD0]"}`}
        >
          <LuPlus className="h-4 w-4" />
          Add Money
        </button>

        <Link
          href="/wallet"
          className={`mt-2 flex w-full items-center justify-center gap-2 ${dark ? "rounded-lg border border-white/10 py-2 text-xs font-medium text-white/70 transition hover:bg-white/5" : "rounded-lg border border-white/10 py-2 text-xs font-medium text-[#A5A8C3] transition hover:bg-white/[0.04]"}`}
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
