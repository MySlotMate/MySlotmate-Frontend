"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "~/utils/firebase";
import { FiMenu, FiX, FiChevronRight } from "react-icons/fi";
import { IoLocationSharp } from "react-icons/io5";
import Link from "next/link";
import GoogleLogin from "./GoogleLogin";
import LocationModal, {
  getSavedLocation,
  saveLocation,
  type CityLocation,
} from "./LocationModal";
import { BecomeHostModal } from "./become-host";
import { WalletDisplay } from "./wallet";
import AccountSheet from "./AccountSheet";
import {
  rememberAccount,
  useSavedAccounts,
  type LoginHint,
  type SavedAccount,
} from "~/lib/savedAccounts";
import {
  useMyProfile,
  useApplicationStatus,
  useCoHostSummary,
} from "~/hooks/useApi";
import { useIdToken } from "~/hooks/useIdToken";
import { useStoredAuth } from "~/hooks/useStoredAuth";
import { useQueryClient } from "@tanstack/react-query";
import { env } from "~/env";
import { setStoredHostId } from "~/lib/auth-storage";
import { signOutEverywhere } from "~/lib/signOut";

export default function Navbar({ dark = false }: { dark?: boolean } = {}) {
  const [firebaseUser] = useAuthState(auth);
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
  const { userId: storedUserId } = useStoredAuth();

  useEffect(() => {
    const saved = getSavedLocation();
    if (saved) {
      setLocation(saved);
      return;
    }
    // Auto-detect at most ONCE per device. The navbar re-mounts on every route
    // change; if the reverse-geocode below fails (or the browser is set to
    // "ask every time"), nothing gets persisted — so without this guard the
    // permission prompt reappears on every navigation. The flag stops that, and
    // the user can still set their city manually via the location button.
    if (localStorage.getItem("msm_geo_asked")) {
      return;
    }
    if (navigator.geolocation) {
      localStorage.setItem("msm_geo_asked", "1");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          // Persist coordinates immediately so a failed reverse-geocode can't
          // leave us with nothing saved (which would re-trigger the prompt).
          const baseLoc: CityLocation = {
            city: "Select City",
            state: "",
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          saveLocation(baseLoc);
          setLocation(baseLoc);
          void (async () => {
            try {
              const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&addressdetails=1`,
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
              /* keep baseLoc coords; user can refine via the location modal */
            }
          })();
        },
        () => {
          /* permission denied — flag is set, so we won't prompt again */
        },
        { enableHighAccuracy: false, timeout: 10_000 },
      );
    }
  }, []);

  // Hydration guard: ensure component is mounted before rendering content that depends on client-side state
  useEffect(() => {
    setMounted(true);
  }, []);

  const validUserId =
    storedUserId && storedUserId !== "existing" ? storedUserId : null;

  // Auto-prompt login: if the visitor is still not logged in 10s after the
  // page loads, surface the login modal. Guarded by sessionStorage so it fires
  // once per visit — the navbar remounts on every route change (see the geo
  // comment above), which would otherwise re-trigger it on every navigation.
  useEffect(() => {
    if (!mounted || validUserId) return;
    if (sessionStorage.getItem("msm_login_prompted")) return;
    const timer = setTimeout(() => {
      sessionStorage.setItem("msm_login_prompted", "1");
      setShowLogin(true);
    }, 10000);
    return () => clearTimeout(timer);
  }, [mounted, validUserId]);

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

  // Accounts used on this device, for the switcher in Settings.
  const { accounts: savedAccounts, forget: forgetAccount } = useSavedAccounts();
  const [loginHint, setLoginHint] = useState<LoginHint | null>(null);
  const [addingAccount, setAddingAccount] = useState(false);
  useEffect(() => {
    if (!user || !validUserId) return;
    rememberAccount({
      id: validUserId,
      name: user.displayName,
      email: user.email === "" ? null : user.email,
      phone: user.phoneNumber,
      photo: user.photoURL,
      method: firebaseUser?.providerData.some(
        (p) => p.providerId === "google.com",
      )
        ? "google"
        : "phone",
    });
  }, [user, validUserId, firebaseUser]);

  const hostStatus = hostData?.status?.application_status ?? null;

  // Co-hosting is independent of host approval: someone can be invited to
  // co-host an experience while their own application is still a draft, and they
  // still need a way in. Show the entry only when they actually have invites.
  const navIdToken = useIdToken();
  const { data: cohostSummary } = useCoHostSummary(navIdToken);
  const hasCoHostInvites = (cohostSummary?.received ?? 0) > 0;
  // A co-host without their own host profile reaches the dashboard through
  // the settings sheet. The entry vanishes once the share goes inactive (see
  // coHostActive in cohost_repository.go), so nothing has to be revoked by hand.

  const isAdminUser = useMemo(() => {
    if (!user?.email) return false;
    const adminEmails = String(env.NEXT_PUBLIC_ADMIN_EMAIL ?? "")
      .toLowerCase()
      .split(",")
      .map((e) => e.trim());
    return adminEmails.includes(user.email.toLowerCase());
  }, [user?.email]);

  useEffect(() => {
    if (hostData?.status?.id) {
      setStoredHostId(hostData.status.id);
    }
  }, [hostData?.status?.id]);

  useEffect(() => {
    if (
      dbProfile &&
      (dbProfile.name === "Guest User" || dbProfile.name === "")
    ) {
      setShowLogin(true);
    }
  }, [dbProfile]);

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

  // The home page sidebar's "Profile" item has no access to this component's
  // state, so it asks via a window event: open the profile panel, or login.
  useEffect(() => {
    const open = () => (user ? setProfileOpen(true) : setShowLogin(true));
    window.addEventListener("msm:open-profile", open);
    return () => window.removeEventListener("msm:open-profile", open);
  }, [user]);

  // Log out and land on the signed-out home page. See signOutEverywhere for
  // why the order of steps matters.
  const handleLogout = async () => {
    setProfileOpen(false);
    setMobileOpen(false);
    await signOutEverywhere();
  };

  // Sign out, then open the login for the chosen account (or a new one).
  const switchAccount = async (a: SavedAccount | null) => {
    // Stay on this page: the login opens right after.
    setProfileOpen(false);
    setMobileOpen(false);
    await signOutEverywhere({ redirect: false });
    queryClient.clear();
    setLoginHint(
      a
        ? { method: a.method, email: a.email, phone: a.phone, name: a.name }
        : null,
    );
    setAddingAccount(!a);
    setShowLogin(true);
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 z-[200] h-[4.5rem] w-full backdrop-blur-2xl ${dark ? "hidden" : "border-b border-white/[0.06] bg-[#080914]/85"} ${mobileOpen ? "hidden lg:block" : ""}`}
      >
        <div className="site-x mx-auto flex h-[4.5rem] w-full max-w-[77rem] items-center">
          {/* Logo — the dark (home) variant shows it in the desktop sidebar instead */}
          <Link href="/" className={`flex-shrink-0 ${dark ? "lg:hidden" : ""}`}>
            {dark ? (
              <span className="font-outfit text-2xl font-bold text-white">
                MySlotMate
              </span>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/assets/brand/logo-horizontal-white.png"
                alt="MySlotMate"
                width={1048}
                height={209}
                className="h-8 w-auto"
              />
            )}
          </Link>

          {/* Desktop center nav (matches reference nav styles) */}
          <div
            className={`hidden flex-1 items-center justify-center gap-8 text-[15px] font-medium text-[#A5A8C3] ${dark ? "" : "lg:flex"}`}
          >
            {[
              ["/#discover", "Discover"],
              ["/about", "About"],
              ["/host-with-us", "Host with us"],
              ["/blogs", "Stories"],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href!}
                className="transition hover:text-white"
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Desktop right side */}
          <div className="ml-auto hidden items-center gap-5 lg:flex">
            <Link
              href="/explore"
              className={`${dark ? "hidden" : ""} font-outfit flex h-10 items-center rounded-full bg-[#F8F7FF] px-5 text-[15px] font-semibold text-[#080914] transition hover:bg-white`}
            >
              Explore
            </Link>
            <button
              onClick={() => setLocationOpen(true)}
              suppressHydrationWarning
              className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition ${dark ? "hover:bg-white/5" : "hover:bg-white/[0.04]"}`}
            >
              <IoLocationSharp
                className={`h-5 w-5 ${dark ? "text-[#B57BFF]" : "text-[#D8B4FE]"}`}
              />
              <div className="text-left leading-tight">
                {mounted ? (
                  <>
                    <p
                      className={`font-semibold ${dark ? "text-white" : "text-white"}`}
                    >
                      {location?.city ?? "Select City"}
                    </p>
                    <p
                      className={`text-xs ${dark ? "text-white/50" : "text-[#A5A8C3]"}`}
                    >
                      {location?.state ?? "Tap to detect"}
                    </p>
                  </>
                ) : (
                  <>
                    <p
                      className={`font-semibold ${dark ? "text-white" : "text-white"}`}
                    >
                      Select City
                    </p>
                    <p
                      className={`text-xs ${dark ? "text-white/50" : "text-[#A5A8C3]"}`}
                    >
                      Tap to detect
                    </p>
                  </>
                )}
              </div>
            </button>

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
                <Link
                  href="/profile"
                  aria-label="Profile"
                  suppressHydrationWarning
                  className={`flex cursor-pointer items-center gap-2 rounded-full border-2 p-0.5 transition hover:shadow-md ${dark ? "border-[#9B30FF]" : "border-[#A020F0]"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={user.photoURL ?? "/assets/home/avatar-placeholder.svg"}
                    alt={user.displayName ?? "Profile"}
                    loading="lazy"
                    className="h-8 w-8 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </Link>
              ) : (
                <button
                  onClick={() => setShowLogin(true)}
                  aria-label="Login"
                  suppressHydrationWarning
                  className={`flex cursor-pointer items-center justify-center rounded-full border-2 p-0.5 transition hover:shadow-md ${dark ? "border-[#9B30FF]" : "border-[#A020F0]"}`}
                >
                  <svg
                    className={`h-8 w-8 ${dark ? "text-[#B57BFF]" : "text-[#D8B4FE]"}`}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                  </svg>
                </button>
              )}

              {profileOpen && user && (
                <AccountSheet
                  user={user}
                  userId={validUserId ?? null}
                  hostStatus={hostStatus}
                  hasCoHostInvites={hasCoHostInvites}
                  isAdmin={isAdminUser}
                  panelRef={profilePanelRef}
                  onClose={() => setProfileOpen(false)}
                  onLogout={handleLogout}
                  city={location?.city ?? null}
                  onBecomeHost={() => setShowBecomeHost(true)}
                  onChangeCity={() => setLocationOpen(true)}
                  accounts={savedAccounts.filter((a) => a.id !== validUserId)}
                  onSwitchAccount={(a) => void switchAccount(a)}
                  onAddAccount={() => void switchAccount(null)}
                  onForgetAccount={forgetAccount}
                />
              )}
            </div>
          </div>

          {/* Location button — mobile and tablet.
              ml-auto pushes it (and the hamburger after it) to the right edge,
              so location sits directly to the left of the burger menu. */}
          <button
            onClick={() => setLocationOpen(true)}
            suppressHydrationWarning
            className={`mr-1 ml-auto flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 transition lg:hidden ${dark ? "hover:bg-white/5" : "hover:bg-white/[0.04]"}`}
          >
            <IoLocationSharp
              className={`h-4 w-4 ${dark ? "text-[#B57BFF]" : "text-[#D8B4FE]"}`}
            />
            <div className="hidden text-left text-xs leading-tight sm:block">
              {mounted ? (
                <>
                  <p
                    className={`font-semibold ${dark ? "text-white" : "text-white"}`}
                  >
                    {location?.city ?? "City"}
                  </p>
                </>
              ) : (
                <>
                  <p
                    className={`font-semibold ${dark ? "text-white" : "text-white"}`}
                  >
                    City
                  </p>
                </>
              )}
            </div>
          </button>

          {/* Hamburger — mobile */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className={`rounded-lg p-2 transition lg:hidden ${dark ? "text-white hover:bg-white/10" : "text-white/80 hover:bg-white/[0.06]"}`}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <FiX className="h-6 w-6" />
            ) : (
              <FiMenu className="h-6 w-6" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile drawer backdrop */}
      {mobileOpen && (
        <div
          className="msm-modal fixed inset-0 z-[150] bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer (sliding sidebar) */}
      {mobileOpen && (
        <div className="fixed top-0 right-0 z-[160] flex h-full w-full max-w-xs flex-col bg-[#121426] shadow-2xl lg:hidden">
          {/* Header inside mobile drawer */}
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <Link href="/" onClick={() => setMobileOpen(false)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/brand/logo-horizontal-white.png"
                alt="MySlotMate"
                width={1048}
                height={209}
                className="h-7 w-auto"
              />
            </Link>
            <button
              onClick={() => setMobileOpen(false)}
              className="rounded-lg p-2 text-white/80 transition hover:bg-white/[0.06]"
              aria-label="Close menu"
            >
              <FiX className="h-6 w-6" />
            </button>
          </div>

          {/* Scrollable menu content */}
          <div className="flex-1 overflow-y-auto px-5 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="mb-4 grid grid-cols-2 gap-2">
              <Link
                href="/#hosts"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-center text-sm font-bold text-[#5d87a8] transition hover:text-[#D8B4FE]"
              >
                Hosts
              </Link>
              <Link
                href="/#how-it-works"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-center text-sm font-bold text-[#5d87a8] transition hover:text-[#D8B4FE]"
              >
                How it works
              </Link>

              <Link
                href="/#community"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-center text-sm font-bold text-[#5d87a8] transition hover:text-[#D8B4FE]"
              >
                Community
              </Link>
              <Link
                href="/blogs"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-center text-sm font-bold text-[#5d87a8] transition hover:text-[#D8B4FE]"
              >
                Blog
              </Link>
            </div>

            {user ? (
              <Link
                href="/profile"
                onClick={() => setMobileOpen(false)}
                className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#131328] p-3 text-left transition hover:bg-[#1A1A35]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={user.photoURL ?? "/assets/home/avatar-placeholder.svg"}
                  alt=""
                  loading="lazy"
                  className="h-10 w-10 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-white">
                    {user.displayName}
                  </span>
                  <span className="block text-xs text-white/50">
                    View profile
                  </span>
                </span>
                <FiChevronRight className="h-4 w-4 text-white/40" />
              </Link>
            ) : (
              <button
                onClick={() => {
                  setShowLogin(true);
                  setMobileOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[#D8B4FE] transition hover:bg-[#241333]"
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

      <GoogleLogin
        open={showLogin}
        onClose={() => {
          setShowLogin(false);
          setLoginHint(null);
          setAddingAccount(false);
        }}
        hint={loginHint}
        {...(loginHint
          ? {
              title: `Switch to ${loginHint.name?.split(" ")[0] ?? "your account"}`,
              subtitle:
                loginHint.method === "google"
                  ? `Continue with Google as ${loginHint.email ?? "that account"}.`
                  : "We'll send a code to that number.",
            }
          : addingAccount
            ? {
                title: "Add an account",
                subtitle:
                  "Sign in with another account. You can switch back from Settings.",
              }
            : {})}
      />
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
