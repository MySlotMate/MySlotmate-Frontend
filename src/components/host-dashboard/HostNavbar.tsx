"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { signOut } from "firebase/auth";
import { useQueryClient } from "@tanstack/react-query";
import { FiBell, FiChevronRight } from "react-icons/fi";
import {
  LuArrowLeft,
  LuHeart,
  LuCalendarDays,
  LuFileText,
  LuHome,
  LuLayoutDashboard,
  LuLogOut,
  LuMessageSquare,
  LuShield,
  LuUser,
  LuWallet,
} from "react-icons/lu";
import type { IconType } from "react-icons";
import { auth } from "~/utils/firebase";
import { useMyProfile, useApplicationStatus } from "~/hooks/useApi";
import { useStoredAuth } from "~/hooks/useStoredAuth";
import { clearStoredAuth, setStoredHostId } from "~/lib/auth-storage";
import { WalletDisplay } from "../wallet";

const NAV_LINKS: {
  label: string;
  href: string;
  icon: IconType;
}[] = [
  { label: "Overview", href: "/host-dashboard", icon: LuLayoutDashboard },
  { label: "Calendar", href: "/host-dashboard/calendar", icon: LuCalendarDays },
  { label: "Messages", href: "/host-dashboard/messages", icon: LuMessageSquare },
  { label: "Earnings", href: "/host-dashboard/earnings", icon: LuWallet },
];

export default function HostNavbar() {
  const pathname = usePathname();
  const [firebaseUser] = useAuthState(auth);
  const [profileOpen, setProfileOpen] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const profilePanelRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { userId: storedUserId } = useStoredAuth();

  const [isScrolledDown, setIsScrolledDown] = useState(false);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (Math.abs(currentScrollY - lastScrollY) < 10) {
        return;
      }
      if (currentScrollY > 80) {
        if (currentScrollY > lastScrollY) {
          setIsScrolledDown(true);
        } else {
          setIsScrolledDown(false);
        }
      } else {
        setIsScrolledDown(false);
      }
      lastScrollY = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  const validUserId =
    storedUserId && storedUserId !== "existing" ? storedUserId : null;

  const { data: dbProfile } = useMyProfile(validUserId);

  const user = useMemo(() => {
    if (firebaseUser) {
      return {
        displayName: firebaseUser.displayName,
        email: firebaseUser.email,
        photoURL: firebaseUser.photoURL,
        phoneNumber: firebaseUser.phoneNumber,
      };
    }
    if (dbProfile) {
      return {
        displayName: dbProfile.name,
        email: dbProfile.email || "",
        photoURL: dbProfile.avatar_url ?? null,
        phoneNumber: dbProfile.phn_number || null,
      };
    }
    return null;
  }, [firebaseUser, dbProfile]);

  const { data: hostData } = useApplicationStatus(validUserId);
  const hostStatus = hostData?.status?.application_status ?? null;

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
    void queryClient.clear();
    setProfileOpen(false);
    void signOut(auth);
  };

  const isNavActive = (href: (typeof NAV_LINKS)[number]["href"]) =>
    href === "/host-dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <>
      <nav className={`relative sticky top-0 z-[200] w-full border-b border-gray-200/80 bg-white/95 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-transform duration-300 ${
        isScrolledDown ? "-translate-y-full md:translate-y-0" : "translate-y-0"
      }`}>
        <div className="h-[3px] w-full bg-[#0094CA]" />
        <div className="site-x mx-auto flex h-16 max-w-7xl items-center justify-between">
          <Link href="/" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/home/logo.png"
              alt="Myslotmate"
              className="h-9 w-auto"
            />
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map(({ label, href }) => {
              const active = isNavActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative pb-0.5 text-sm font-medium transition ${active
                      ? "text-[#0094CA]"
                      : "text-gray-600 hover:text-gray-900"
                    }`}
                >
                  {label}
                  {active && (
                    <span className="absolute right-0 -bottom-[1.19rem] left-0 h-[2px] rounded bg-[#0094CA]" />
                  )}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-4">
            <button
              aria-label="Notifications"
              className="relative rounded-full p-2 text-gray-600 transition hover:bg-gray-100"
            >
              <FiBell className="h-5 w-5" />
            </button>

            {user && (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen((open) => !open)}
                  aria-label="Open profile panel"
                  className="flex cursor-pointer items-center gap-2 rounded-full border-2 border-[#0094CA] p-0.5 transition hover:shadow-md"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={user.photoURL ?? "/assets/home/avatar-placeholder.png"}
                    alt={user.displayName ?? "Profile"}
                    className="h-9 w-9 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </button>

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

                        <div className="flex items-center gap-4 px-5 py-5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={
                              user.photoURL ??
                              "/assets/home/avatar-placeholder.png"
                            }
                            alt=""
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
                          {hostStatus === "approved" && (
                            <span className="ml-auto flex-shrink-0 rounded-full bg-[#e6f8ff] px-2.5 py-1 text-[10px] font-bold tracking-wide text-[#0094CA] uppercase">
                              Verified Host
                            </span>
                          )}
                        </div>

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

                          <div className="mb-4 divide-y divide-gray-200 rounded-xl border border-gray-200">
                            <Link
                              href="/host-dashboard/profile"
                              onClick={() => setProfileOpen(false)}
                              className="flex w-full items-center justify-between px-4 py-3.5 text-sm text-gray-800 transition hover:bg-gray-50"
                            >
                              <span className="flex items-center gap-3">
                                <LuUser className="h-5 w-5 text-gray-600" />
                                Host profile
                              </span>
                              <FiChevronRight className="h-4 w-4 text-gray-400" />
                            </Link>
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

                          <p className="mt-5 mb-1 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                            More
                          </p>
                          <div className="divide-y divide-gray-200 rounded-xl border border-gray-200">
                            <Link
                              href="/support/terms-conditions"
                              onClick={() => setProfileOpen(false)}
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
                              onClick={() => setProfileOpen(false)}
                              className="flex w-full items-center justify-between px-4 py-3.5 text-sm text-gray-800 transition hover:bg-gray-50"
                            >
                              <span className="flex items-center gap-3">
                                <LuFileText className="h-5 w-5 text-gray-600" />
                                Privacy Policy
                              </span>
                              <FiChevronRight className="h-4 w-4 text-gray-400" />
                            </Link>
                          </div>

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
            )}
          </div>
        </div>

        <div className="border-t border-gray-100 bg-white/95 md:hidden">
          <div className="site-x mx-auto max-w-7xl">
            <div className="flex h-14 items-center justify-around">
              {NAV_LINKS.map(({ label, href, icon: Icon }) => {
                const active = isNavActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`group relative flex h-full w-full flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors ${
                      active
                        ? "text-[#0094CA]"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    <span
                      className={`flex h-6 w-11 items-center justify-center rounded-full transition-colors ${
                        active ? "bg-[#0094CA]/10" : "bg-transparent"
                      }`}
                    >
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
