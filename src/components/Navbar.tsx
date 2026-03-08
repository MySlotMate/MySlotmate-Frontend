"use client";

import { useState, useRef, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { signOut } from "firebase/auth";
import { auth } from "~/utils/firebase";
import { FiSearch, FiMenu, FiX, FiChevronRight } from "react-icons/fi";
import { IoLocationSharp } from "react-icons/io5";
import { LuCalendarDays, LuBookmarkMinus, LuMessageSquare, LuShield, LuFileText, LuLogOut, LuArrowLeft, LuHome, LuHeart } from "react-icons/lu";
import Link from "next/link";
import GoogleLogin from "./GoogleLogin";
import { BecomeHostModal } from "./become-host";
import AadharVerificationModal from "./AadharVerificationModal";
import { useMyProfile, useApplicationStatus, queryKeys } from "~/hooks/useApi";
import { useQueryClient } from "@tanstack/react-query";

export default function Navbar() {
  const [user] = useAuthState(auth);
  const [showLogin, setShowLogin] = useState(false);
  const [showBecomeHost, setShowBecomeHost] = useState(false);
  const [showAadharVerify, setShowAadharVerify] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
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

  // React Query — user profile & host status
  const { data: userProfile } = useMyProfile(validUserId);
  const { data: hostData } = useApplicationStatus(validUserId);

  const hostStatus = hostData?.application_status ?? null;
  const isVerified = userProfile?.is_verified ?? false;

  // Sync host_id to localStorage for other pages
  useEffect(() => {
    if (hostData?.id) {
      localStorage.setItem("msm_host_id", hostData.id);
    }
  }, [hostData?.id]);

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
      {/* Navbar */}
      <nav className="sticky top-0 z-40 w-full bg-white shadow-sm">
        {/* Top accent line */}
        <div className="h-[3px] w-full bg-[#0094CA]" />

        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left: Logo */}
          <div className="flex-shrink-0">
            <img
              src="/assets/home/logo.png"
              alt="Myslotmate"
              className="h-10 w-auto"
            />
          </div>

          {/* Right side — desktop */}
          <div className="hidden md:flex items-center gap-5">
            {/* Location */}
            <div className="flex items-center gap-1.5 text-sm">
              <IoLocationSharp className="h-5 w-5 text-[#0094CA]" />
              <div className="leading-tight">
                <p className="font-semibold text-gray-900">Guwahati</p>
                <p className="text-xs text-gray-500">Assam</p>
              </div>
            </div>

            {/* Search */}
            <button
              aria-label="Search"
              className="rounded-full p-2 text-[#0094CA] hover:bg-[#e6f8ff] transition"
            >
              <FiSearch className="h-5 w-5" />
            </button>

            {/* Profile / Login */}
            <div className="relative" ref={profileRef}>
              {user ? (
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex cursor-pointer items-center gap-2 rounded-full border-2 border-[#0094CA] p-0.5 transition hover:shadow-md"
                >
                  <img
                    src={user.photoURL ?? "/assets/home/avatar-placeholder.png"}
                    alt={user.displayName ?? "Profile"}
                    className="h-8 w-8 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </button>
              ) : (
                <button
                  onClick={() => setShowLogin(true)}
                  aria-label="Login"
                  className="flex cursor-pointer items-center justify-center rounded-full border-2 border-[#0094CA] p-0.5 transition hover:shadow-md"
                >
                  {/* Faceless avatar SVG */}
                  <svg
                    className="h-8 w-8 text-[#0094CA]"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                  </svg>
                </button>
              )}

              {/* Profile dropdown (logged in) — slide-out panel */}
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
                        <LuArrowLeft className="h-5 w-5 text-gray-800" />
                      </button>
                      <h2 className="text-lg font-bold text-gray-900">Profile</h2>
                    </div>

                    {/* User info */}
                    <div className="flex items-center gap-4 px-5 py-5">
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
                        <span className="ml-auto flex-shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                          🟡 Host Request Under Review
                        </span>
                      ) : hostStatus === "approved" ? (
                        <span className="ml-auto flex-shrink-0 rounded-full bg-[#e6f8ff] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#0094CA]">
                          ✅ Verified Host
                        </span>
                      ) : null}
                    </div>

                    {/* Aadhaar Verification section */}
                    {validUserId && !isVerified && (
                      <div className="mx-5 mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              Aadhaar Verification
                            </p>
                            <p className="text-xs text-gray-500">
                              Required to become a host
                            </p>
                          </div>
                          <button
                            onClick={() => setShowAadharVerify(true)}
                            className="rounded-lg bg-[#0094CA] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#007dab]"
                          >
                            Verify Now
                          </button>
                        </div>
                      </div>
                    )}
                    {validUserId && isVerified && (
                      <div className="mx-5 mb-3 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
                        <LuShield className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="text-sm font-semibold text-green-800">
                            Aadhaar Verified
                          </p>
                          <p className="text-xs text-green-600">
                            Your identity has been verified
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Menu sections */}
                    <div className="flex-1 overflow-y-auto px-5">
                      {/* Host-specific items (shown for verified hosts) */}
                      {hostStatus === "approved" && (
                        <div className="mb-4 rounded-xl border border-gray-200 divide-y divide-gray-200">
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
                          <button
                            onClick={() => setProfileOpen(false)}
                            className="flex w-full items-center justify-between px-4 py-3.5 text-sm text-gray-800 hover:bg-gray-50 transition"
                          >
                            <span className="flex items-center gap-3">
                              <LuCalendarDays className="h-5 w-5 text-gray-600" />
                              View all bookings
                            </span>
                            <FiChevronRight className="h-4 w-4 text-gray-400" />
                          </button>
                          <button
                            onClick={() => setProfileOpen(false)}
                            className="flex w-full items-center justify-between px-4 py-3.5 text-sm text-gray-800 hover:bg-gray-50 transition"
                          >
                            <span className="flex items-center gap-3">
                              <LuHeart className="h-5 w-5 text-gray-600" />
                              Saved experiences
                            </span>
                            <FiChevronRight className="h-4 w-4 text-gray-400" />
                          </button>
                        </div>
                      )}

                      {/* Regular user items (no host or pending) */}
                      {hostStatus !== "approved" && (
                        <div className="rounded-xl border border-gray-200 divide-y divide-gray-200">
                          <button className="flex w-full items-center justify-between px-4 py-3.5 text-sm text-gray-800 hover:bg-gray-50 transition">
                            <span className="flex items-center gap-3">
                              <LuCalendarDays className="h-5 w-5 text-gray-600" />
                              View all bookings
                            </span>
                            <FiChevronRight className="h-4 w-4 text-gray-400" />
                          </button>
                          <button className="flex w-full items-center justify-between px-4 py-3.5 text-sm text-gray-800 hover:bg-gray-50 transition">
                            <span className="flex items-center gap-3">
                              <LuBookmarkMinus className="h-5 w-5 text-gray-600" />
                              Saved experiences
                            </span>
                            <FiChevronRight className="h-4 w-4 text-gray-400" />
                          </button>
                        </div>
                      )}

                      {/* Support */}
                      <p className="mb-1 mt-5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Support
                      </p>
                      <div className="rounded-xl border border-gray-200">
                        <button className="flex w-full items-center justify-between px-4 py-3.5 text-sm text-gray-800 hover:bg-gray-50 transition">
                          <span className="flex items-center gap-3">
                            <LuMessageSquare className="h-5 w-5 text-gray-600" />
                            Chat with us
                          </span>
                          <FiChevronRight className="h-4 w-4 text-gray-400" />
                        </button>
                      </div>

                      {/* More */}
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

          {/* Hamburger — mobile */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden rounded-lg p-2 text-gray-700 hover:bg-gray-100 transition"
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <FiX className="h-6 w-6" />
            ) : (
              <FiMenu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 pb-4 pt-2 shadow-lg">
            {/* Location */}
            <div className="flex items-center gap-2 py-3">
              <IoLocationSharp className="h-5 w-5 text-[#0094CA]" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Guwahati</p>
                <p className="text-xs text-gray-500">Assam</p>
              </div>
            </div>

            {/* Search */}
            <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition">
              <FiSearch className="h-5 w-5 text-[#0094CA]" />
              Search
            </button>

            <hr className="my-2" />

            {/* Auth section */}
            {user ? (
              <button
                onClick={() => {
                  setProfileOpen(true);
                  setMobileOpen(false);
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-50 transition"
              >
                <img
                  src={user.photoURL ?? "/assets/home/avatar-placeholder.png"}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="overflow-hidden text-left">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {user.displayName}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {user.email}
                  </p>
                </div>
              </button>
            ) : (
              <button
                onClick={() => {
                  setShowLogin(true);
                  setMobileOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[#0094CA] hover:bg-[#e6f8ff] transition"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                </svg>
                Login / Sign up
              </button>
            )}
          </div>
        )}
      </nav>

      {/* Google Login Modal */}
      <GoogleLogin open={showLogin} onClose={() => setShowLogin(false)} />

      {/* Become a Host Modal */}
      <BecomeHostModal open={showBecomeHost} onClose={() => setShowBecomeHost(false)} />

      {/* Aadhaar Verification Modal */}
      {validUserId && (
        <AadharVerificationModal
          open={showAadharVerify}
          onClose={() => setShowAadharVerify(false)}
          userId={validUserId}
          onVerified={() => {
            void queryClient.invalidateQueries({
              queryKey: queryKeys.myProfile(validUserId),
            });
          }}
        />
      )}
    </>
  );
}
