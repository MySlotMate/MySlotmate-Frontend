"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { signOut } from "firebase/auth";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowLeftRight,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  FileText,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  Lock,
  LogOut,
  Menu,
  MessageCircle,
  Plus,
  ScanLine,
  Shield,
  Ticket,
  TrendingUp,
  UserRound,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { auth } from "~/utils/firebase";
import {
  useApplicationStatus,
  useCoHostSummary,
  useHostAttentionItems,
  useMyProfile,
} from "~/hooks/useApi";
import { useIdToken } from "~/hooks/useIdToken";
import { useStoredAuth } from "~/hooks/useStoredAuth";
import { clearStoredAuth, setStoredHostId } from "~/lib/auth-storage";
import { BOOST_ENABLED } from "~/lib/boost";
import { WalletDisplay } from "../wallet";

const BASE = "/host-dashboard";

/**
 * Goes to the previous page; in a fresh tab with no history it goes to the
 * homepage instead, so the button never does nothing.
 */
function BackButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label="Go back"
      title="Back"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push("/");
      }}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/75 transition hover:bg-white/10 hover:text-white ${className}`}
    >
      <ArrowLeft className="h-4 w-4" />
    </button>
  );
}

type NavItem = { label: string; href: string; icon: LucideIcon };

const TODAY: NavItem = { label: "Today", href: BASE, icon: LayoutDashboard };
const EVENTS: NavItem = {
  label: "Events",
  href: `${BASE}/experiences`,
  icon: Ticket,
};
const CALENDAR: NavItem = {
  label: "Calendar",
  href: `${BASE}/calendar`,
  icon: CalendarDays,
};
const BOOKINGS: NavItem = {
  label: "Bookings",
  href: `${BASE}/bookings`,
  icon: ClipboardList,
};
const CHECK_IN: NavItem = {
  label: "Check-in",
  href: `${BASE}/scan`,
  icon: ScanLine,
};
const MESSAGES: NavItem = {
  label: "Messages",
  href: `${BASE}/messages`,
  icon: MessageCircle,
};
const REQUESTS: NavItem = {
  label: "Requests",
  href: `${BASE}/requests`,
  icon: Inbox,
};
const EARNINGS: NavItem = {
  label: "Earnings",
  href: `${BASE}/earnings`,
  icon: Wallet,
};
const PROMOTE: NavItem = {
  label: "Promote",
  href: `${BASE}/promote`,
  icon: TrendingUp,
};
const PROFILE: NavItem = {
  label: "Host profile",
  href: `${BASE}/profile`,
  icon: UserRound,
};
const CO_HOSTS: NavItem = {
  label: "Co-hosts",
  href: `${BASE}/co-hosting`,
  icon: Users,
};

/** Editors carry their own sticky save bar on phones, so the tabs step aside. */
const FOCUS_ROUTES = /^\/host-dashboard\/experiences\/[^/]+$/;

function isActive(path: string, href: string) {
  return href === BASE ? path === BASE : path.startsWith(href);
}

function Badge({ n, dot }: { n: number; dot?: boolean }) {
  if (n <= 0) return null;
  if (dot)
    return (
      <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0A0B17] bg-[#F43F5E]" />
    );
  return (
    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[#A020F0] px-1.5 text-[11px] font-semibold text-white">
      {n > 99 ? "99+" : n}
    </span>
  );
}

/**
 * The host workspace: a grouped sidebar on desktop (icon rail on laptops),
 * and on phones a slim top bar plus a five-tab bar with Create in the middle.
 * Everything else lives one tap away in the Menu sheet.
 */
export default function HostShell({ children }: { children: React.ReactNode }) {
  const path = usePathname() ?? BASE;
  const queryClient = useQueryClient();
  const [firebaseUser] = useAuthState(auth);
  const { userId, hostId } = useStoredAuth();
  const validUserId = userId && userId !== "existing" ? userId : null;
  const [menuOpen, setMenuOpen] = useState(false);

  const { data: dbProfile } = useMyProfile(validUserId);
  const { data: hostData } = useApplicationStatus(validUserId);
  const verified = hostData?.status?.application_status === "approved";
  // Earnings stays visible to free hosts, with a lock, so they find it.
  const locked = (href: string) => !verified && href === EARNINGS.href;
  useEffect(() => {
    if (hostData?.status?.id) setStoredHostId(hostData.status.id);
  }, [hostData?.status?.id]);

  const idToken = useIdToken();
  const { data: cohost } = useCoHostSummary(idToken);
  const hasCoHosting =
    (cohost?.received ?? 0) > 0 || (cohost?.granted ?? 0) > 0;

  const { data: attention } = useHostAttentionItems(hostId);
  const unread =
    attention?.find((a) => a.type === "unread_message")?.count ?? 0;

  // Close the sheet whenever the route changes.
  useEffect(() => setMenuOpen(false), [path]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // Auth comes from localStorage / Firebase, which the server can't see:
  // render the signed-out shell until mounted so hydration matches.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const user = useMemo(() => {
    if (!mounted) return null;
    if (firebaseUser)
      return {
        name: firebaseUser.displayName ?? "Host",
        contact: firebaseUser.phoneNumber ?? firebaseUser.email ?? "",
        email: firebaseUser.email ?? undefined,
        phone: firebaseUser.phoneNumber ?? undefined,
        photo: firebaseUser.photoURL,
      };
    if (dbProfile)
      return {
        name: dbProfile.name ?? "Host",
        contact: dbProfile.phn_number || dbProfile.email || "",
        email: dbProfile.email || undefined,
        phone: dbProfile.phn_number || undefined,
        photo: dbProfile.avatar_url ?? null,
      };
    return null;
  }, [mounted, firebaseUser, dbProfile]);
  const avatar = user?.photo ?? "/assets/home/avatar-placeholder.svg";

  const groups: { title?: string; items: NavItem[] }[] = [
    { items: [TODAY] },
    { title: "Hosting", items: [EVENTS, CALENDAR, BOOKINGS, CHECK_IN] },
    { title: "Inbox", items: [MESSAGES, REQUESTS] },
    {
      title: "Business",
      items: [
        EARNINGS,
        ...(BOOST_ENABLED ? [PROMOTE] : []),
        ...(hasCoHosting ? [CO_HOSTS] : []),
        PROFILE,
      ],
    },
  ];
  const badgeFor = (href: string) => (href === MESSAGES.href ? unread : 0);

  const focus = FOCUS_ROUTES.test(path);

  const logout = () => {
    clearStoredAuth();
    queryClient.clear();
    setMenuOpen(false);
    void signOut(auth);
  };

  /* ---------------------------- desktop rail ---------------------------- */
  const railLink =
    "group relative flex h-11 items-center justify-center rounded-xl text-[15px] font-medium transition xl:justify-start xl:gap-3 xl:px-3";
  const sidebar = (
    <aside className="fixed inset-y-0 left-0 z-[210] hidden w-[76px] flex-col border-r border-white/[0.06] bg-[#0A0B17] md:flex xl:w-[248px]">
      <div className="flex shrink-0 flex-col items-center gap-3 py-4 xl:h-[72px] xl:flex-row xl:gap-3 xl:px-4 xl:py-0">
        <BackButton />
        {/* The logo always goes to the MySlotMate homepage. */}
        <Link href="/" aria-label="MySlotMate home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/brand/logo-mark.png"
            alt="MySlotMate"
            className="h-9 w-9 xl:hidden"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/brand/logo-horizontal-white.png"
            alt="MySlotMate"
            className="hidden h-7 w-auto xl:block"
          />
        </Link>
      </div>

      <div className="px-3 xl:px-4">
        <Link
          href={`${BASE}/experiences/new`}
          title="Create event"
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7B2FFF] to-[#A020F0] text-[15px] font-semibold text-white shadow-[0_10px_30px_-10px_rgba(160,32,240,0.7)] transition hover:brightness-110"
        >
          <Plus className="h-5 w-5" />
          <span className="sr-only xl:not-sr-only">Create event</span>
        </Link>
      </div>

      <nav
        aria-label="Host"
        className="mt-4 flex flex-1 flex-col gap-5 overflow-y-auto px-3 pb-4 [scrollbar-width:none] xl:px-4"
      >
        {groups.map((g, gi) => (
          <div key={gi} className="flex flex-col gap-1">
            {g.title && (
              <p className="mb-1 hidden px-3 text-[11px] font-semibold tracking-[0.12em] text-white/35 uppercase xl:block">
                {g.title}
              </p>
            )}
            {g.title && (
              <span className="mx-auto mb-1 h-px w-8 bg-white/10 xl:hidden" />
            )}
            {g.items.map((it) => {
              const on = isActive(path, it.href);
              const n = badgeFor(it.href);
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  title={it.label}
                  aria-current={on ? "page" : undefined}
                  className={`${railLink} ${
                    on
                      ? "bg-gradient-to-r from-[#2E1A4D] to-[#1E1335] text-[#E9D8FD]"
                      : "text-white/65 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  <span className="relative">
                    <it.icon className="h-5 w-5" />
                    <span className="xl:hidden">
                      <Badge n={n} dot />
                    </span>
                  </span>
                  <span className="sr-only xl:not-sr-only">{it.label}</span>
                  <span className="hidden xl:contents">
                    <Badge n={n} />
                  </span>
                  {locked(it.href) && (
                    <Lock
                      aria-label="Locked"
                      className="ml-auto hidden h-3.5 w-3.5 text-white/40 xl:block"
                    />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="flex flex-col gap-1 border-t border-white/[0.06] p-3 xl:p-4">
        <Link
          href="/explore"
          title="Switch to guest"
          className={`${railLink} text-white/65 hover:bg-white/[0.05] hover:text-white`}
        >
          <ArrowLeftRight className="h-5 w-5" />
          <span className="sr-only xl:not-sr-only">Switch to guest</span>
        </Link>
        {user && (
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            title="Account"
            className="flex items-center justify-center gap-3 rounded-xl p-1.5 text-left transition hover:bg-white/[0.05] xl:justify-start xl:p-2"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatar}
              alt=""
              referrerPolicy="no-referrer"
              className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-[#A020F0]/60"
            />
            <span className="hidden min-w-0 xl:block">
              <span className="block truncate text-sm font-semibold text-white">
                {user.name}
              </span>
              <span className="block truncate text-xs text-white/45">
                {verified ? "Verified host" : "Free host"}
              </span>
            </span>
          </button>
        )}
      </div>
    </aside>
  );

  /* ---------------------------- mobile chrome --------------------------- */
  const topBar = (
    <header className="sticky top-0 z-[200] flex h-14 items-center gap-3 border-b border-white/[0.06] bg-[#080914]/85 px-4 backdrop-blur-xl md:hidden">
      <BackButton className="-ml-1" />
      <Link
        href="/"
        aria-label="MySlotMate home"
        className="flex min-w-0 flex-1 items-center gap-2"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/brand/logo-horizontal-white.png"
          alt="MySlotMate"
          className="h-6 w-auto"
        />
        <span className="rounded-full bg-[#A020F0]/20 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-[#D8B4FE] uppercase">
          Host
        </span>
      </Link>
      <Link
        href={CHECK_IN.href}
        aria-label="Scan tickets"
        className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10"
      >
        <ScanLine className="h-5 w-5" />
      </Link>
      <Link
        href={MESSAGES.href}
        aria-label={unread ? `Messages, ${unread} unread` : "Messages"}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10"
      >
        <span className="relative">
          <MessageCircle className="h-5 w-5" />
          <Badge n={unread} dot />
        </span>
      </Link>
      <button
        type="button"
        onClick={() => setMenuOpen(true)}
        aria-label="Account"
        className="ml-1 shrink-0"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatar}
          alt=""
          referrerPolicy="no-referrer"
          className="h-8 w-8 rounded-full object-cover ring-2 ring-[#A020F0]/60"
        />
      </button>
    </header>
  );

  const tab =
    "flex min-w-0 flex-1 flex-col items-center gap-1 text-[11px] font-medium transition";
  const tabs: NavItem[] = [TODAY, EVENTS];
  const tabsRight: NavItem[] = [CALENDAR];
  const renderTab = (it: NavItem) => {
    const on = isActive(path, it.href) && !path.endsWith("/new");
    return (
      <Link
        key={it.href}
        href={it.href}
        aria-current={on ? "page" : undefined}
        className={`${tab} ${on ? "text-[#E9D8FD]" : "text-white/55"}`}
      >
        <span
          className={`flex h-7 w-12 items-center justify-center rounded-full ${on ? "bg-[#A020F0]/20" : ""}`}
        >
          <it.icon className="h-5 w-5" />
        </span>
        {it.label}
      </Link>
    );
  };
  const tabBar = (
    <nav
      aria-label="Host"
      hidden={focus}
      className="fixed inset-x-0 bottom-0 z-[210] border-t border-white/[0.08] bg-[#0A0B17]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <div className="flex h-16 items-center px-1">
        {tabs.map(renderTab)}
        <div className="flex flex-1 justify-center">
          <Link
            href={`${BASE}/experiences/new`}
            aria-label="Create event"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-[#7B2FFF] to-[#A020F0] text-white shadow-[0_8px_24px_rgba(160,32,240,0.5)]"
          >
            <Plus className="h-6 w-6" />
          </Link>
        </div>
        {tabsRight.map(renderTab)}
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className={`${tab} ${menuOpen ? "text-[#E9D8FD]" : "text-white/55"}`}
        >
          <span className="relative flex h-7 w-12 items-center justify-center rounded-full">
            <Menu className="h-5 w-5" />
          </span>
          Menu
        </button>
      </div>
    </nav>
  );

  /* ------------------------------ menu sheet ---------------------------- */
  const row =
    "flex w-full items-center gap-3 px-4 py-3.5 text-[15px] text-white transition hover:bg-white/[0.04]";
  const sheet = menuOpen && (
    <div
      className="msm-modal fixed inset-0 z-[1000]"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Close menu"
        onClick={() => setMenuOpen(false)}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div className="absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-[28px] border-t border-white/10 bg-[#121426] shadow-2xl md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[400px] md:rounded-none md:border-t-0 md:border-l">
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-white/20 md:hidden" />
        <div className="flex items-center gap-3 px-5 pt-4 pb-4 md:pt-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatar}
            alt=""
            referrerPolicy="no-referrer"
            className="h-12 w-12 rounded-full object-cover ring-2 ring-[#A020F0]/60"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-white">
              {user?.name ?? "Host"}
            </p>
            <p className="truncate text-sm text-white/50">
              {verified ? "Verified host" : "Free host"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Close"
            className="flex h-10 w-10 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-[max(24px,env(safe-area-inset-bottom))]">
          {/* Every host page, as a tile grid on phones */}
          <div className="mb-5 grid grid-cols-3 gap-2 md:hidden">
            {groups
              .flatMap((g) => g.items)
              .map((it) => {
                const on = isActive(path, it.href);
                const n = badgeFor(it.href);
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    className={`relative flex flex-col items-center gap-2 rounded-2xl px-2 py-4 text-center text-[13px] font-medium transition ${
                      on
                        ? "bg-[#A020F0]/20 text-[#E9D8FD]"
                        : "bg-white/[0.04] text-white/80 hover:bg-white/[0.07]"
                    }`}
                  >
                    <span className="relative">
                      <it.icon className="h-6 w-6" />
                      <Badge n={n} dot />
                      {locked(it.href) && (
                        <Lock className="absolute -right-2 -bottom-1 h-3.5 w-3.5 rounded-full bg-[#121426] p-0.5 text-white/60" />
                      )}
                    </span>
                    {it.label}
                  </Link>
                );
              })}
          </div>

          {validUserId && (
            <div className="mb-5">
              <WalletDisplay
                userId={validUserId}
                userName={user?.name}
                userEmail={user?.email}
                userPhone={user?.phone}
                variant="sidebar"
              />
            </div>
          )}

          <div className="divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/10">
            <Link href="/explore" className={row}>
              <ArrowLeftRight className="h-5 w-5 text-white/55" />
              <span className="flex-1">Switch to guest</span>
              <ChevronRight className="h-4 w-4 text-white/35" />
            </Link>
            <Link href="/activities" className={row}>
              <Ticket className="h-5 w-5 text-white/55" />
              <span className="flex-1">My bookings as a guest</span>
              <ChevronRight className="h-4 w-4 text-white/35" />
            </Link>
          </div>

          <p className="mt-5 mb-2 px-1 text-[11px] font-semibold tracking-[0.12em] text-white/35 uppercase">
            Help
          </p>
          <div className="divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/10">
            <Link href="/support" className={row}>
              <LifeBuoy className="h-5 w-5 text-white/55" />
              <span className="flex-1">Support &amp; safety</span>
              <ChevronRight className="h-4 w-4 text-white/35" />
            </Link>
            <Link href="/support/terms-conditions" className={row}>
              <Shield className="h-5 w-5 text-white/55" />
              <span className="flex-1">Terms &amp; conditions</span>
              <ChevronRight className="h-4 w-4 text-white/35" />
            </Link>
            <Link href="/support/policies" className={row}>
              <FileText className="h-5 w-5 text-white/55" />
              <span className="flex-1">Privacy policy</span>
              <ChevronRight className="h-4 w-4 text-white/35" />
            </Link>
          </div>

          <button
            type="button"
            onClick={logout}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 text-[15px] font-medium text-white transition hover:border-red-500/40 hover:bg-red-500/10"
          >
            <LogOut className="h-5 w-5" /> Log out
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#080914] font-[family-name:var(--font-inter)] text-white">
      {sidebar}
      <div
        className={`md:pl-[76px] xl:pl-[248px] ${focus ? "" : "pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0"}`}
      >
        {topBar}
        {children}
      </div>
      {tabBar}
      {sheet}
    </div>
  );
}

/** Page header used across the host pages: title, subtitle, actions. */
export function HostPageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-outfit text-[26px] leading-tight font-semibold tracking-[-0.01em] text-white sm:text-[32px]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 text-[15px] text-white/55">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  );
}

/** Segmented switch between sibling pages (e.g. Messages | Requests). */
export function HostSegments({
  items,
}: {
  items: { label: string; href: string }[];
}) {
  const path = usePathname() ?? "";
  return (
    <div className="mb-6 inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1">
      {items.map((it) => {
        const on = path === it.href;
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={on ? "page" : undefined}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
              on ? "bg-white text-[#080914]" : "text-white/65 hover:text-white"
            }`}
          >
            {it.label}
          </Link>
        );
      })}
    </div>
  );
}
