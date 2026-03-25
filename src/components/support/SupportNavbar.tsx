"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { useEffect, useRef, useState } from "react";
import { signOut } from "firebase/auth";
import { FiBell, FiX, FiArrowLeft, FiChevronRight } from "react-icons/fi";
import { LuHome, LuCalendarDays, LuBookmarkMinus, LuShield, LuLogOut, LuMessageSquare, LuFileText } from "react-icons/lu";
import { auth } from "~/utils/firebase";
import { useMyProfile, useApplicationStatus } from "~/hooks/useApi";
import { WalletDisplay } from "~/components/wallet";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "~/hooks/useApi";

const SUPPORT_NAV_LINKS = [
  { label: "Report a Participant", href: "/support/report" },
  { label: "Technical Support", href: "/support/technical" },
  { label: "Policy Help", href: "/support/policies" },
] as const;

export default function SupportNavbar() {
  const pathname = usePathname();
  const [user] = useAuthState(auth);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Read stored user id
  const [storedUserId, setStoredUserId] = useState<string | null>(null);
  useEffect(() => {
    setStoredUserId(localStorage.getItem("msm_user_id"));
  }, [profileOpen]);

  const validUserId =
    storedUserId && storedUserId !== "existing" ? storedUserId : null;

  const { data: userProfile } = useMyProfile(validUserId);
  const { data: hostData } = useApplicationStatus(validUserId);
  
  const hostStatus = (hostData as { application_status?: string | null })?.application_status ?? null;

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <>
      <nav className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between site-x">
          {/* Logo */}
          <Link href="/" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/home/logo.png"
              alt="Myslotmate"
              className="h-9 w-auto"
            />
          </Link>

          {/* Nav links — desktop */}
          <div className="hidden md:flex items-center gap-8">
            {SUPPORT_NAV_LINKS.map(({ label, href }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative pb-0.5 text-sm font-medium transition ${
                    active
                      ? "text-[#0094CA]"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {label}
                  {active && (
                    <span className="absolute -bottom-0.5 left-0 right-0 h-0.5 rounded bg-[#0094CA]" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Notification bell */}
            <button
              aria-label="Notifications"
              className="relative rounded-full p-2 text-gray-600 hover:bg-gray-100 transition"
            >
              <FiBell className="h-5 w-5" />
            </button>

            {/* Avatar — Profile Button */}
            <div className="relative" ref={profileRef}>
              {user ? (
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex cursor-pointer items-center gap-2 rounded-full border-2 border-[#0094CA] p-0.5 transition hover:shadow-md"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={user.photoURL ?? "/assets/home/avatar-placeholder.png"}
                    alt={user.displayName ?? "Profile"}
                    className="h-9 w-9 rounded-full border-2 border-[#0094CA] object-cover"
                    referrerPolicy="no-referrer"
                  />
                </button>
              ) : null}

              {/* Profile Panel */}
              {profileOpen && user && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40 bg-black/30"
                    onClick={() => setProfileOpen(false)}
                  />
                  {/* Panel */}
                  <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl">
                    {/* Header */}
                    <div className="flex items-center gap-3 border-b px-5 py-4">
                      <button
                        onClick={() => setProfileOpen(false)}
                        className="rounded-lg p-1 hover:bg-gray-100 transition"
                      >
                        <FiArrowLeft className="h-5 w-5 text-gray-800" />
                      </button>
                      <h2 className="text-lg font-bold text-gray-900">Profile</h2>
                    </div>

                    {/* User info */}
                    <div className="flex items-center gap-4 px-5 py-5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={user.photoURL ?? "/assets/home/avatar-placeholder.png"}
                        alt=""
                        className="h-14 w-14 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="overflow-hidden flex-1">
                        <p className="truncate text-base font-bold text-gray-900">
                          {user.displayName}
                        </p>
                        <p className="truncate text-sm text-gray-500">
                          {user.phoneNumber ?? user.email}
                        </p>
                      </div>
                      {/* Host status badge */}
                      {hostStatus === "pending" || hostStatus === "under_review" ? (
                        <span className="ml-auto shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                          🟡 Host Request
                        </span>
                      ) : hostStatus === "approved" ? (
                        <span className="ml-auto shrink-0 rounded-full bg-[#e6f8ff] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#0094CA]">
                          ✅ Verified Host
                        </span>
                      ) : null}
                    </div>

                    {/* Wallet Balance section */}
                    {validUserId && (
                      <div className="mx-5 mb-3">
                        <WalletDisplay
                          userId={validUserId}
                          userName={user.displayName ?? undefined}
                          userEmail={user.email ?? undefined}
                          userPhone={user.phoneNumber ?? undefined}
                          variant="sidebar"
                        />
                      </div>
                    )}

                    {/* Host Status section */}
                    {validUserId && !hostStatus && (
                      <div className="mx-5 mb-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              Become a Host
                            </p>
                            <p className="text-xs text-gray-500">
                              Start hosting experiences
                            </p>
                          </div>
                          <Link
                            href="/become-host"
                            className="rounded-lg bg-[#0094CA] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#007dab]"
                          >
                            Get Started
                          </Link>
                        </div>
                      </div>
                    )}
                    {validUserId && hostStatus === "draft" && (
                      <div className="mx-5 mb-3 rounded-xl border border-gray-300 bg-gray-50 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-700">
                            📝
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">Draft Application</p>
                            <p className="text-xs text-gray-600">Complete your application</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {validUserId && hostStatus === "pending" && (
                      <div className="mx-5 mb-3 rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-200 text-sm font-semibold text-yellow-700">
                            ⏳
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-yellow-900">Application Submitted</p>
                            <p className="text-xs text-yellow-700">Waiting for review</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {validUserId && hostStatus === "under_review" && (
                      <div className="mx-5 mb-3 rounded-xl border border-yellow-400 bg-yellow-50 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-200 text-sm font-semibold text-yellow-700">
                            🔍
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-yellow-900">Under Review</p>
                            <p className="text-xs text-yellow-700">Admin is reviewing your application</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {validUserId && hostStatus === "rejected" && (
                      <div className="mx-5 mb-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-200 text-sm font-semibold text-red-700">
                            ❌
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-red-900">Application Rejected</p>
                            <p className="text-xs text-red-700">Contact support for details</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {validUserId && hostStatus === "approved" && (
                      <div className="mx-5 mb-3 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
                        <LuShield className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="text-sm font-semibold text-green-800">
                            Host Verified
                          </p>
                          <p className="text-xs text-green-600">
                            Your host account is active
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Menu sections */}
                    <div className="flex-1 overflow-y-auto px-5">
                      {/* Host Dashboard link */}
                      {hostStatus === "approved" && (
                        <div className="mb-4 rounded-xl border border-gray-200">
                          <Link
                            href="/host-dashboard"
                            onClick={() => setProfileOpen(false)}
                            className="flex w-full items-center justify-between px-4 py-3.5 text-sm text-gray-800 hover:bg-gray-50 transition"
                          >
                            <span className="flex items-center gap-3">
                              <LuHome className="h-5 w-5 text-gray-600" />
                              Host dashboard
                            </span>
                            <FiChevronRight className="h-4 w-4 text-gray-400" />
                          </Link>
                        </div>
                      )}

                      {/* Bookings & Saved */}
                      <div className="mb-4 rounded-xl border border-gray-200 divide-y divide-gray-200">
                        <Link
                          href="/activities"
                          onClick={() => setProfileOpen(false)}
                          className="flex w-full items-center justify-between px-4 py-3.5 text-sm text-gray-800 hover:bg-gray-50 transition"
                        >
                          <span className="flex items-center gap-3">
                            <LuCalendarDays className="h-5 w-5 text-gray-600" />
                            View all bookings
                          </span>
                          <FiChevronRight className="h-4 w-4 text-gray-400" />
                        </Link>
                        <Link
                          href="/activities"
                          onClick={() => setProfileOpen(false)}
                          className="flex w-full items-center justify-between px-4 py-3.5 text-sm text-gray-800 hover:bg-gray-50 transition"
                        >
                          <span className="flex items-center gap-3">
                            <LuBookmarkMinus className="h-5 w-5 text-gray-600" />
                            Saved experiences
                          </span>
                          <FiChevronRight className="h-4 w-4 text-gray-400" />
                        </Link>
                      </div>

                      {/* Support */}
                      <p className="mb-1 mt-5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        More
                      </p>
                      <div className="rounded-xl border border-gray-200 divide-y divide-gray-200">
                        <button className="flex w-full items-center justify-between px-4 py-3.5 text-sm text-gray-800 hover:bg-gray-50 transition">
                          <span className="flex items-center gap-3">
                            <LuShield className="h-5 w-5 text-gray-600" />
                            Terms &amp; Conditions
                          </span>
                          <FiChevronRight className="h-4 w-4 text-gray-400" />
                        </button>
                        <button className="flex w-full items-center justify-between px-4 py-3.5 text-sm text-gray-800 hover:bg-gray-50 transition">
                          <span className="flex items-center gap-3">
                            <LuFileText className="h-5 w-5 text-gray-600" />
                            Privacy Policy
                          </span>
                          <FiChevronRight className="h-4 w-4 text-gray-400" />
                        </button>
                      </div>

                      {/* Logout */}
                      <div className="mt-5 mb-6 rounded-xl border border-gray-200">
                        <button
                          onClick={() => {
                            void signOut(auth);
                            setProfileOpen(false);
                          }}
                          className="flex w-full items-center gap-3 px-4 py-3.5 text-sm text-gray-800 hover:bg-red-50 transition"
                        >
                          <LuLogOut className="h-5 w-5 text-gray-600" />
                          Logout
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile nav links */}
        <div className="flex md:hidden items-center gap-1 overflow-x-auto border-t border-gray-100 site-x hide-scrollbar">
          {SUPPORT_NAV_LINKS.map(({ label, href }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`relative whitespace-nowrap py-3 px-3 text-xs font-semibold transition ${
                  active
                    ? "text-[#0094CA]"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {label}
                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0094CA]" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

    </>
  );
}
