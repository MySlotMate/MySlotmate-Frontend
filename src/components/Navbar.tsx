"use client";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { signOut } from "firebase/auth";
import { auth } from "~/utils/firebase";
import { FiSearch, FiMenu, FiX, FiChevronRight } from "react-icons/fi";
import { IoLocationSharp } from "react-icons/io5";
import {
  LuCalendarDays,
  LuBookmarkMinus,
  LuMessageSquare,
  LuShield,
  LuFileText,
  LuLogOut,
  LuArrowLeft,
  LuHome,
  LuHeart,
} from "react-icons/lu";
import Link from "next/link";
import GoogleLogin from "./GoogleLogin";
import LocationModal, {
  getSavedLocation,
  saveLocation,
  type CityLocation,
} from "./LocationModal";
import { BecomeHostModal } from "./become-host";
import { WalletDisplay } from "./wallet";
import { useMyProfile, useApplicationStatus } from "~/hooks/useApi";
import { useStoredAuth } from "~/hooks/useStoredAuth";
import { useQueryClient } from "@tanstack/react-query";
import { env } from "~/env";
import { clearStoredAuth, setStoredHostId } from "~/lib/auth-storage";

export default function Navbar() {
  const [user] = useAuthState(auth);
  const [showLogin, setShowLogin] = useState(false);
  const [showBecomeHost, setShowBecomeHost] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [location, setLocation] = useState<CityLocation | null>(null);
  const [mounted, setMounted] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const profilePanelRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const { userId: storedUserId } = useStoredAuth();

  useEffect(() => {
    const saved = getSavedLocation();
    if (saved) {
      setLocation(saved);
      return;
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          void (async () => {
            try {
              const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&addressdetails=1`,
                { headers: { "User-Agent": "MySlotMate/1.0" } },
              );
              const data = (await res.json()) as {
                address?: {
                  city?: string;
                  town?: string;
                  village?: string;
                  state_district?: string;
                  county?: string;
                  state?: string;
                };
              };
              const addr = data.address;
              if (addr) {
                const city =
                  addr.city ??
                  addr.town ??
                  addr.village ??
                  addr.state_district ??
                  addr.county ??
                  "Unknown";
                const loc: CityLocation = {
                  city,
                  state: addr.state ?? "",
                  lat: pos.coords.latitude,
                  lng: pos.coords.longitude,
                };
                saveLocation(loc);
                setLocation(loc);
              }
            } catch {
              /* silently fail */
            }
          })();
        },
        () => {
          /* permission denied */
        },
        { enableHighAccuracy: false, timeout: 10_000 },
      );
    }
  }, []);

  // Hydration guard: ensure component is mounted before rendering content that depends on client-side state
  useEffect(() => {
    setMounted(true);
    setPortalTarget(document.body);
  }, []);

  const validUserId =
    storedUserId && storedUserId !== "existing" ? storedUserId : null;

  useMyProfile(validUserId);
  const { data: hostData, isLoading: hostLoading } =
    useApplicationStatus(validUserId);

  const hostStatus = hostData?.status?.application_status ?? null;

  const isAdminUser =
    !!user?.email &&
    user.email.toLowerCase() ===
      String(env.NEXT_PUBLIC_ADMIN_EMAIL ?? "").toLowerCase();

  const showBecomeHostButton = !hostLoading && !!validUserId && !hostStatus;

  useEffect(() => {
    if (hostData?.status?.id) {
      setStoredHostId(hostData.status.id);
    }
  }, [hostData?.status?.id]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const clickedTrigger = profileRef.current?.contains(target) ?? false;
      const clickedPanel = profilePanelRef.current?.contains(target) ?? false;

      if (!clickedTrigger && !clickedPanel) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    clearStoredAuth();
    localStorage.removeItem("msm_location");

    // Clear query cache
    void queryClient.clear();

    // Close modals
    setProfileOpen(false);
    setMobileOpen(false);

    // Sign out from Firebase
    void signOut(auth);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 z-[200] h-[4.5rem] w-full bg-[#ffffff3e] shadow-sm backdrop-blur-2xl">
        <div className="h-[3px] w-full bg-[#0094CA]" />
        <div className="site-x mx-auto flex h-16 w-full max-w-[77rem] items-center">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/home/logo.png"
              alt="Myslotmate"
              loading="lazy"
              className="h-10 w-auto"
            />
          </Link>

          {/* Desktop center nav (matches reference nav styles) */}
          <div className="hidden flex-1 items-center justify-center gap-[22px] text-[0.92rem] font-bold text-[#6f8daa] lg:flex">
            <Link
              href="/#how-it-works"
              className="transition hover:text-[#0e8ae0]"
            >
              How it works
            </Link>
            <Link href="/#hosts" className="transition hover:text-[#0e8ae0]">
              Hosts
            </Link>
            <Link
              href="/#community"
              className="transition hover:text-[#0e8ae0]"
            >
              Community
            </Link>
          </div>

          {/* Desktop right side */}
          <div className="ml-auto hidden items-center gap-5 lg:flex">
            <Link
              href="/explore"
              className="rounded-[8px] bg-[linear-gradient(135deg,#1fa7ff,#63ceff)] px-[20px] py-[13px] font-bold text-[#ffffff] shadow-[0_16px_32px_rgba(31,167,255,0.24)] transition hover:-translate-y-0.5"
            >
              Explore
            </Link>
            <button
              onClick={() => setLocationOpen(true)}
              suppressHydrationWarning
              className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition hover:bg-gray-50"
            >
              <IoLocationSharp className="h-5 w-5 text-[#0094CA]" />
              <div className="text-left leading-tight">
                {mounted ? (
                  <>
                    <p className="font-semibold text-gray-900">
                      {location?.city ?? "Select City"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {location?.state ?? "Tap to detect"}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-gray-900">Select City</p>
                    <p className="text-xs text-gray-500">Tap to detect</p>
                  </>
                )}
              </div>
            </button>

            {/* <button aria-label="Search" className="rounded-full p-2 text-[#0094CA] hover:bg-[#e6f8ff] transition">
              <FiSearch className="h-5 w-5" />
            </button> */}

            {user && validUserId && (
              <WalletDisplay
                userId={validUserId}
                userName={user.displayName ?? undefined}
                userEmail={user.email ?? undefined}
                userPhone={user.phoneNumber ?? undefined}
                variant="compact"
              />
            )}

            <div className="relative" ref={profileRef}>
              {user ? (
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  suppressHydrationWarning
                  className="flex cursor-pointer items-center gap-2 rounded-full border-2 border-[#0094CA] p-0.5 transition hover:shadow-md"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={user.photoURL ?? "/assets/home/avatar-placeholder.png"}
                    alt={user.displayName ?? "Profile"}
                    loading="lazy"
                    className="h-8 w-8 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </button>
              ) : (
                <button
                  onClick={() => setShowLogin(true)}
                  aria-label="Login"
                  suppressHydrationWarning
                  className="flex cursor-pointer items-center justify-center rounded-full border-2 border-[#0094CA] p-0.5 transition hover:shadow-md"
                >
                  <svg
                    className="h-8 w-8 text-[#0094CA]"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                  </svg>
                </button>
              )}

              {profileOpen && user && portalTarget
                ? createPortal(
                    <>
                      <div
                        className="fixed inset-0 z-[1000] bg-black/30"
                        onClick={() => setProfileOpen(false)}
                      />
                      <div
                        ref={profilePanelRef}
                        className="fixed top-0 right-0 z-[1010] flex h-full w-full max-w-sm flex-col bg-white shadow-2xl"
                      >
                        {/* Header */}
                        <div className="flex items-center gap-3 border-b px-5 py-4">
                          <button
                            onClick={() => setProfileOpen(false)}
                            className="rounded-lg p-1 transition hover:bg-gray-100"
                          >
                            <LuArrowLeft className="h-5 w-5 text-gray-800" />
                          </button>
                          <h2 className="text-lg font-bold text-gray-900">
                            Profile
                          </h2>
                        </div>

                        {/* User info */}
                        <div className="flex items-center gap-4 px-5 py-5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={
                              user.photoURL ??
                              "/assets/home/avatar-placeholder.png"
                            }
                            alt=""
                            loading="lazy"
                            className="h-14 w-14 rounded-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex-1 overflow-hidden">
                            <p className="truncate text-base font-bold text-gray-900">
                              {user.displayName}
                            </p>
                            <p className="truncate text-sm text-gray-500">
                              {user.phoneNumber ?? user.email}
                            </p>
                          </div>
                          {hostStatus === "pending" ||
                          hostStatus === "under_review" ? (
                            <span className="ml-auto flex-shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold tracking-wide text-amber-700 uppercase">
                              Under Review
                            </span>
                          ) : hostStatus === "approved" ? (
                            <span className="ml-auto flex-shrink-0 rounded-full bg-[#e6f8ff] px-2.5 py-1 text-[10px] font-bold tracking-wide text-[#0094CA] uppercase">
                              Verified Host
                            </span>
                          ) : null}
                        </div>

                        {/* Wallet */}
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

                        <div className="flex-1 overflow-y-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                          {/* Host Dashboard card - Approved hosts */}
                          {hostStatus === "approved" && (
                            <div className="mb-4 flex items-center justify-between rounded-xl border border-[#cceeff] bg-[#f0faff] px-4 py-3">
                              <div>
                                <p className="text-sm font-bold text-gray-900">
                                  Host Dashboard
                                </p>
                                <p className="text-xs text-gray-500">
                                  Manage your experiences
                                </p>
                              </div>
                              <Link
                                href="/host-dashboard"
                                onClick={() => setProfileOpen(false)}
                                className="rounded-xl bg-[#0094CA] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#007dab]"
                              >
                                Go Now
                              </Link>
                            </div>
                          )}

                          {/* Become a Host card - Non-hosts */}
                          {showBecomeHostButton && (
                            <div className="z-[10000] mb-4 flex items-center justify-between rounded-xl border border-[#cceeff] bg-[#f0faff] px-4 py-3">
                              <div>
                                <p className="text-sm font-bold text-gray-900">
                                  Become a Host
                                </p>
                                <p className="text-xs text-gray-500">
                                  Start hosting experiences
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  setShowBecomeHost(true);
                                  setProfileOpen(false);
                                }}
                                className="rounded-xl bg-[#0094CA] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#007dab]"
                              >
                                Get Started
                              </button>
                            </div>
                          )}

                          {/* Host dashboard items */}
                          {hostStatus === "approved" && (
                            <div className="mb-4 divide-y divide-gray-200 rounded-xl border border-gray-200">
                              <Link
                                href="/host-dashboard"
                                onClick={() => setProfileOpen(false)}
                                className="flex w-full items-center justify-between px-4 py-3.5 text-sm text-gray-800 transition hover:bg-gray-50"
                              >
                                <span className="flex items-center gap-3">
                                  <LuHome className="h-5 w-5 text-gray-600" />
                                  Host dashboard
                                </span>
                                <FiChevronRight className="h-4 w-4 text-gray-400" />
                              </Link>
                              <Link
                                href="/activities"
                                onClick={() => setProfileOpen(false)}
                                className="flex w-full items-center justify-between px-4 py-3.5 text-sm text-gray-800 transition hover:bg-gray-50"
                              >
                                <span className="flex items-center gap-3">
                                  <LuCalendarDays className="h-5 w-5 text-gray-600" />
                                  View all bookings
                                </span>
                                <FiChevronRight className="h-4 w-4 text-gray-400" />
                              </Link>
                              <Link
                                href="/saved-experiences"
                                onClick={() => setProfileOpen(false)}
                                className="flex w-full items-center justify-between px-4 py-3.5 text-sm text-gray-800 transition hover:bg-gray-50"
                              >
                                <span className="flex items-center gap-3">
                                  <LuHeart className="h-5 w-5 text-gray-600" />
                                  Saved experiences
                                </span>
                                <FiChevronRight className="h-4 w-4 text-gray-400" />
                              </Link>
                            </div>
                          )}

                          {/* Regular user items */}
                          {hostStatus !== "approved" && (
                            <div className="divide-y divide-gray-200 rounded-xl border border-gray-200">
                              <Link
                                href="/activities"
                                onClick={() => setProfileOpen(false)}
                                className="flex w-full items-center justify-between px-4 py-3.5 text-sm text-gray-800 transition hover:bg-gray-50"
                              >
                                <span className="flex items-center gap-3">
                                  <LuCalendarDays className="h-5 w-5 text-gray-600" />
                                  View all bookings
                                </span>
                                <FiChevronRight className="h-4 w-4 text-gray-400" />
                              </Link>
                              <Link
                                href="/saved-experiences"
                                onClick={() => setProfileOpen(false)}
                                className="flex w-full items-center justify-between px-4 py-3.5 text-sm text-gray-800 transition hover:bg-gray-50"
                              >
                                <span className="flex items-center gap-3">
                                  <LuBookmarkMinus className="h-5 w-5 text-gray-600" />
                                  Saved experiences
                                </span>
                                <FiChevronRight className="h-4 w-4 text-gray-400" />
                              </Link>
                            </div>
                          )}

                          {/* Admin */}
                          {isAdminUser && (
                            <>
                              <p className="mt-5 mb-1 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                Admin
                              </p>
                              <div className="rounded-xl border border-gray-200">
                                <Link
                                  href="/admin"
                                  onClick={() => setProfileOpen(false)}
                                  className="flex w-full items-center justify-between px-4 py-3.5 text-sm text-gray-800 transition hover:bg-gray-50"
                                >
                                  <span className="flex items-center gap-3">
                                    <LuShield className="h-5 w-5 text-gray-600" />
                                    View Admin Dashboard
                                  </span>
                                  <FiChevronRight className="h-4 w-4 text-gray-400" />
                                </Link>
                              </div>
                            </>
                          )}

                          {/* Support */}
                          <p className="mt-5 mb-1 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                            Support
                          </p>
                          <div className="rounded-xl border border-gray-200">
                            <Link
                              href="/support"
                              onClick={() => setProfileOpen(false)}
                              className="flex w-full items-center justify-between px-4 py-3.5 text-sm text-gray-800 transition hover:bg-gray-50"
                            >
                              <span className="flex items-center gap-3">
                                <LuMessageSquare className="h-5 w-5 text-gray-600" />
                                Support &amp; Safety
                              </span>
                              <FiChevronRight className="h-4 w-4 text-gray-400" />
                            </Link>
                          </div>

                          {/* More */}
                          <p className="mt-5 mb-1 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                            More
                          </p>
                          <div className="divide-y divide-gray-200 rounded-xl border border-gray-200">
                            <Link
                              href="/support/terms-conditions"
                              className="flex w-full items-center justify-between px-4 py-3.5 text-sm text-gray-800 transition hover:bg-gray-50"
                            >
                              <span className="flex items-center gap-3">
                                <LuShield className="h-5 w-5 text-gray-600" />
                                Terms &amp; Conditions
                              </span>
                              <FiChevronRight className="h-4 w-4 text-gray-400" />
                            </Link>
                            <Link
                              href="/support/policies"
                              className="flex w-full items-center justify-between px-4 py-3.5 text-sm text-gray-800 transition hover:bg-gray-50"
                            >
                              <span className="flex items-center gap-3">
                                <LuFileText className="h-5 w-5 text-gray-600" />
                                Privacy Policy
                              </span>
                              <FiChevronRight className="h-4 w-4 text-gray-400" />
                            </Link>
                          </div>

                          {/* Logout */}
                          <div className="mt-5 mb-6 rounded-xl border border-gray-200">
                            <button
                              onClick={handleLogout}
                              className="flex w-full items-center gap-3 px-4 py-3.5 text-sm text-gray-800 transition hover:bg-red-50"
                            >
                              <LuLogOut className="h-5 w-5 text-gray-600" />
                              Logout
                            </button>
                          </div>
                        </div>
                      </div>
                    </>,
                    portalTarget,
                  )
                : null}
            </div>
          </div>

          {/* Location button — mobile and tablet */}
          <button
            onClick={() => setLocationOpen(true)}
            suppressHydrationWarning
            className="mr-3 flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 transition hover:bg-gray-50 lg:hidden"
          >
            <IoLocationSharp className="h-4 w-4 text-[#0094CA]" />
            <div className="hidden text-left text-xs leading-tight sm:block">
              {mounted ? (
                <>
                  <p className="font-semibold text-gray-900">
                    {location?.city ?? "City"}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-gray-900">City</p>
                </>
              )}
            </div>
          </button>

          {/* Hamburger — mobile */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="ml-auto rounded-lg p-2 text-gray-700 transition hover:bg-gray-100 lg:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <FiX className="h-6 w-6" />
            ) : (
              <FiMenu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile drawer backdrop */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-[150] bg-black/20 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-x-0 top-[4.5rem] z-[160] max-h-[calc(100vh-4.5rem)] overflow-y-auto border-t border-gray-100 bg-white shadow-lg [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden">
            <div className="site-x pt-4 pb-4">
              {/* Location display */}
              {mounted && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                  <IoLocationSharp className="h-4 w-4 flex-shrink-0 text-[#0094CA]" />
                  <div className="text-left text-sm">
                    <p className="font-semibold text-gray-900">
                      {location?.city ?? "Select City"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {location?.state ?? "Tap to set location"}
                    </p>
                  </div>
                </div>
              )}

              {/* Navigation boxes */}
              <div className="mb-4 grid grid-cols-3 gap-3">
                <Link
                  href="/#how-it-works"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg border border-[#d6ebf7] bg-[#f7fcff] px-3 py-3 text-center text-sm font-bold text-[#5d87a8] transition hover:bg-[#f0f9ff] hover:text-[#0e8ae0]"
                >
                  How it works
                </Link>
                <Link
                  href="/#hosts"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg border border-[#d6ebf7] bg-[#f7fcff] px-3 py-3 text-center text-sm font-bold text-[#5d87a8] transition hover:bg-[#f0f9ff] hover:text-[#0e8ae0]"
                >
                  Host
                </Link>
                <Link
                  href="/#community"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg border border-[#d6ebf7] bg-[#f7fcff] px-3 py-3 text-center text-sm font-bold text-[#5d87a8] transition hover:bg-[#f0f9ff] hover:text-[#0e8ae0]"
                >
                  Community
                </Link>
              </div>

              <hr className="my-5" />

              {user ? (
                <>
                  <div className="flex w-full items-center gap-3 rounded-lg px-3 py-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        user.photoURL ?? "/assets/home/avatar-placeholder.png"
                      }
                      alt=""
                      loading="lazy"
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
                  </div>

                  {validUserId && (
                    <div className="mx-0 my-3">
                      <WalletDisplay
                        userId={validUserId}
                        userName={user.displayName ?? undefined}
                        userEmail={user.email ?? undefined}
                        userPhone={user.phoneNumber ?? undefined}
                        variant="compact"
                      />
                    </div>
                  )}

                  <hr className="my-2" />

                  {/* Host Dashboard — mobile - Approved hosts */}
                  {hostStatus === "approved" && (
                    <div className="mb-3 flex items-center justify-between rounded-xl border border-[#cceeff] bg-[#f0faff] px-4 py-3">
                      <div>
                        <p className="text-sm font-bold text-gray-900">
                          Host Dashboard
                        </p>
                        <p className="text-xs text-gray-500">
                          Manage your experiences
                        </p>
                      </div>
                      <Link
                        href="/host-dashboard"
                        onClick={() => setMobileOpen(false)}
                        className="rounded-xl bg-[#0094CA] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#007dab]"
                      >
                        Go Now
                      </Link>
                    </div>
                  )}

                  {/* Become a Host — mobile - Non-hosts */}
                  {showBecomeHostButton && (
                    <div className="mb-3 flex items-center justify-between rounded-xl border border-[#cceeff] bg-[#f0faff] px-4 py-3">
                      <div>
                        <p className="text-sm font-bold text-gray-900">
                          Become a Host
                        </p>
                        <p className="text-xs text-gray-500">
                          Start hosting experiences
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setShowBecomeHost(true);
                          setMobileOpen(false);
                        }}
                        className="rounded-xl bg-[#0094CA] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#007dab]"
                      >
                        Get Started
                      </button>
                    </div>
                  )}

                  <div className="mb-3 space-y-1.5">
                    <Link
                      href="/activities"
                      onClick={() => setMobileOpen(false)}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50"
                    >
                      <span className="flex items-center gap-3">
                        <LuCalendarDays className="h-5 w-5 text-gray-600" />
                        View all bookings
                      </span>
                      <FiChevronRight className="h-4 w-4 text-gray-400" />
                    </Link>
                    <Link
                      href="/saved-experiences"
                      onClick={() => setMobileOpen(false)}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50"
                    >
                      <span className="flex items-center gap-3">
                        <LuBookmarkMinus className="h-5 w-5 text-gray-600" />
                        Saved experiences
                      </span>
                      <FiChevronRight className="h-4 w-4 text-gray-400" />
                    </Link>
                  </div>

                  {isAdminUser && (
                    <div className="mb-3">
                      <p className="mb-1.5 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                        Admin
                      </p>
                      <Link
                        href="/admin"
                        onClick={() => setMobileOpen(false)}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50"
                      >
                        <span className="flex items-center gap-3">
                          <LuShield className="h-5 w-5 text-gray-600" />
                          Pending applications
                        </span>
                        <FiChevronRight className="h-4 w-4 text-gray-400" />
                      </Link>
                    </div>
                  )}

                  <hr className="my-2" />

                  <div className="mb-3">
                    <p className="mb-1.5 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                      Support
                    </p>
                    <Link
                      href="/support"
                      onClick={() => setMobileOpen(false)}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50"
                    >
                      <span className="flex items-center gap-3">
                        <LuMessageSquare className="h-5 w-5 text-gray-600" />
                        Support &amp; Safety
                      </span>
                      <FiChevronRight className="h-4 w-4 text-gray-400" />
                    </Link>
                  </div>

                  <div className="mb-3">
                    <p className="mb-1.5 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                      More
                    </p>
                    <div className="space-y-1.5">
                      <Link
                        href="/support/terms-conditions"
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50"
                      >
                        <span className="flex items-center gap-3">
                          <LuShield className="h-5 w-5 text-gray-600" />
                          Terms &amp; Conditions
                        </span>
                        <FiChevronRight className="h-4 w-4 text-gray-400" />
                      </Link>
                      <Link
                        href="/support/policies"
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50"
                      >
                        <span className="flex items-center gap-3">
                          <LuFileText className="h-5 w-5 text-gray-600" />
                          Privacy Policy
                        </span>
                        <FiChevronRight className="h-4 w-4 text-gray-400" />
                      </Link>
                    </div>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 transition hover:bg-red-50"
                  >
                    <LuLogOut className="h-5 w-5 text-gray-600" />
                    Logout
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setShowLogin(true);
                    setMobileOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[#0094CA] transition hover:bg-[#e6f8ff]"
                >
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                  </svg>
                  Login / Sign up
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      <GoogleLogin open={showLogin} onClose={() => setShowLogin(false)} />
      <LocationModal
        open={locationOpen}
        onClose={() => setLocationOpen(false)}
        onSelect={(loc) => setLocation(loc)}
        current={location}
      />
      <BecomeHostModal
        open={showBecomeHost}
        onClose={() => setShowBecomeHost(false)}
      />
    </>
  );
}
