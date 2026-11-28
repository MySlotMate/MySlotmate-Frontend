"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode, type Ref } from "react";
import { createPortal } from "react-dom";
import {
  BadgeIndianRupee,
  Bell,
  Bookmark,
  CalendarCheck,
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  Info,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Mail,
  MapPin,
  MessageSquare,
  Newspaper,
  Pencil,
  Plus,
  PlusCircle,
  ScanLine,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Ticket,
  UserRound,
  Users,
  Wrench,
  X,
  BookOpen,
} from "lucide-react";
import { LuBadgeCheck } from "react-icons/lu";
import WalletDisplay from "~/components/wallet/WalletDisplay";
import type { SavedAccount } from "~/lib/savedAccounts";

/**
 * Settings, laid out like the account screens of social and ticketing apps
 * (Instagram, Airbnb, District): shortcuts to the things people reach for
 * most, then the wallet, hosting, account, safety, and about & legal.
 * A bottom sheet on phones, a floating panel on desktop.
 */

export interface AccountSheetUser {
  displayName: string | null;
  email: string | null;
  phoneNumber: string | null;
  photoURL: string | null;
}

const ICON = "h-[18px] w-[18px]";

/**
 * Links like /profile?view=connections don't remount the profile page when
 * you're already on it, so tell the page directly as well.
 */
function profileAction(href: string) {
  if (!href.startsWith("/profile?") || window.location.pathname !== "/profile")
    return;
  window.dispatchEvent(
    new CustomEvent("msm:profile-action", { detail: href.split("?")[1] }),
  );
}

export default function AccountSheet({
  user,
  userId,
  hostStatus,
  hasCoHostInvites,
  isAdmin,
  city,
  panelRef,
  onClose,
  onLogout,
  onBecomeHost,
  onChangeCity,
  accounts = [],
  onSwitchAccount,
  onAddAccount,
  onForgetAccount,
}: {
  user: AccountSheetUser;
  userId: string | null;
  hostStatus: string | null | undefined;
  hasCoHostInvites: boolean;
  isAdmin: boolean;
  /** The city picked in the location picker, if any. */
  city?: string | null;
  panelRef?: Ref<HTMLDivElement>;
  onClose: () => void;
  onLogout: () => void;
  onBecomeHost: () => void;
  onChangeCity: () => void;
  /** Other accounts used on this device (not the signed-in one). */
  accounts?: SavedAccount[];
  onSwitchAccount: (a: SavedAccount) => void;
  onAddAccount: () => void;
  onForgetAccount: (id: string) => void;
}) {
  const [switching, setSwitching] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  const isHost = hostStatus === "approved";
  const underReview = hostStatus === "pending" || hostStatus === "under_review";
  const contact = user.phoneNumber ?? user.email;
  const canHostDash = isHost || hasCoHostInvites;

  // The four things each kind of person opens most.
  const shortcuts: TileProps[] = isHost
    ? [
        {
          href: "/host-dashboard",
          icon: <LayoutDashboard className="h-5 w-5" />,
          label: "Dashboard",
        },
        {
          href: "/host-dashboard/bookings",
          icon: <Ticket className="h-5 w-5" />,
          label: "Bookings",
        },
        {
          href: "/host-dashboard/scan",
          icon: <ScanLine className="h-5 w-5" />,
          label: "Scan tickets",
        },
        {
          href: "/host-dashboard/earnings",
          icon: <BadgeIndianRupee className="h-5 w-5" />,
          label: "Earnings",
        },
      ]
    : [
        {
          href: "/activities",
          icon: <CalendarCheck className="h-5 w-5" />,
          label: "My bookings",
        },
        {
          href: "/saved-experiences",
          icon: <Bookmark className="h-5 w-5" />,
          label: "Saved",
        },
        {
          href: "/profile?view=connections",
          icon: <Users className="h-5 w-5" />,
          label: "Connections",
        },
        canHostDash
          ? {
              href: "/host-dashboard/co-hosting",
              icon: <LayoutDashboard className="h-5 w-5" />,
              label: "Co-hosting",
            }
          : {
              href: "/notifications",
              icon: <Bell className="h-5 w-5" />,
              label: "Alerts",
            },
      ];

  return createPortal(
    <>
      <div
        className="msm-modal animate-in fade-in fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm duration-200"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        className="msm-account-sheet fixed inset-x-0 bottom-0 z-[1010] flex max-h-[92dvh] flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-[#0E0F1F] text-white shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.8)] lg:inset-x-auto lg:top-3 lg:right-3 lg:bottom-3 lg:max-h-none lg:w-[400px] lg:rounded-[28px]"
      >
        <div className="pointer-events-none absolute -top-24 left-1/2 h-56 w-72 -translate-x-1/2 rounded-full bg-[#A020F0]/20 blur-3xl" />

        {/* Grab handle (phones) */}
        <div className="relative mx-auto mt-2.5 h-1 w-10 rounded-full bg-white/20 lg:hidden" />

        {/* Title bar */}
        <div className="relative flex items-center justify-between px-5 pt-3 pb-1 lg:pt-5">
          <h2 className="font-outfit text-xl font-bold">Settings</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="-mr-1 flex h-9 w-9 items-center justify-center rounded-full text-white/55 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative flex-1 overflow-y-auto overscroll-contain px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* Who's signed in, and the account switcher (like Instagram) */}
          <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#131328]">
            <button
              type="button"
              aria-expanded={switching}
              onClick={() => setSwitching((v) => !v)}
              className="flex w-full items-center gap-3 p-3 text-left transition hover:bg-[#1A1A35]"
            >
              <Avatar
                photo={user.photoURL}
                name={user.displayName}
                className="h-12 w-12 ring-2 ring-[#A020F0]/50"
              />
              <span className="min-w-0 flex-1">
                <span className="font-outfit flex items-center gap-1.5 text-base leading-5 font-bold">
                  <span className="truncate">{user.displayName ?? "You"}</span>
                  {isHost && (
                    <LuBadgeCheck
                      className="h-4 w-4 shrink-0 text-[#B57BFF]"
                      aria-label="Verified host"
                    />
                  )}
                </span>
                <span className="block truncate text-[13px] text-white/50">
                  {contact}
                </span>
                {underReview && (
                  <span className="mt-1 inline-block rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                    Host application in review
                  </span>
                )}
              </span>
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-white/75">
                {accounts.length
                  ? `Switch · ${accounts.length + 1}`
                  : "Accounts"}
                <ChevronDown
                  className={`h-3.5 w-3.5 transition ${switching ? "rotate-180" : ""}`}
                />
              </span>
            </button>

            {switching && (
              <div className="border-t border-white/[0.06]">
                <p className="px-3.5 pt-3 pb-1 text-[11px] font-bold tracking-wider text-white/40 uppercase">
                  Accounts on this device
                </p>
                <div className="flex items-center gap-3 px-3.5 py-2.5">
                  <Avatar
                    photo={user.photoURL}
                    name={user.displayName}
                    className="h-9 w-9"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {user.displayName ?? "You"}
                    </span>
                    <span className="block text-[11px] text-white/45">
                      Signed in
                    </span>
                  </span>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#7038F5] to-[#B724EA]">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                </div>
                {accounts.map((a) => (
                  <div key={a.id} className="flex items-center gap-1 pr-2">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onSwitchAccount(a);
                      }}
                      className="flex min-w-0 flex-1 items-center gap-3 px-3.5 py-2.5 text-left transition hover:bg-white/[0.04]"
                    >
                      <Avatar
                        photo={a.photo}
                        name={a.name}
                        className="h-9 w-9"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {a.name ?? "Account"}
                        </span>
                        <span className="block truncate text-[11px] text-white/45">
                          {a.email ?? a.phone}
                        </span>
                      </span>
                      <span className="text-[11px] font-semibold text-[#D8B4FE]">
                        Switch
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${a.name ?? "this account"} from this device`}
                      title="Remove from this device"
                      onClick={() => onForgetAccount(a.id)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/35 transition hover:bg-white/10 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onAddAccount();
                  }}
                  className="flex w-full items-center gap-3 border-t border-white/[0.06] px-3.5 py-3 text-left text-sm font-semibold text-[#D8B4FE] transition hover:bg-white/[0.04]"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-[#A020F0]/50">
                    <Plus className="h-4 w-4" />
                  </span>
                  Add account
                </button>
                <p className="px-3.5 pb-3 text-[11px] leading-4 text-white/40">
                  Switching asks you to sign in to that account. This device
                  only keeps each account&apos;s name, photo and email or phone,
                  never passwords.
                </p>
              </div>
            )}
          </div>

          {/* Shortcuts */}
          <div className="mt-3 grid grid-cols-4 gap-2">
            {shortcuts.map((t) => (
              <Tile key={t.label} {...t} onClick={onClose} />
            ))}
          </div>

          {/* Become a host: for people who haven't applied yet */}
          {!hostStatus && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onBecomeHost();
              }}
              className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-[#A020F0]/25 bg-gradient-to-r from-[#A020F0]/[0.16] to-[#A020F0]/[0.04] p-3 text-left transition hover:border-[#A020F0]/45"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#7038F5] to-[#B724EA] shadow-[0_6px_18px_-6px_rgba(183,36,234,0.7)]">
                <Sparkles className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">
                  Become a host
                </span>
                <span className="block text-xs text-white/55">
                  Host free or paid experiences and earn
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-white/40" />
            </button>
          )}

          {/* Wallet */}
          {userId && (
            <div className="mt-3">
              <WalletDisplay
                userId={userId}
                userName={user.displayName ?? undefined}
                userEmail={user.email ?? undefined}
                userPhone={user.phoneNumber ?? undefined}
                variant="sidebar"
                dark
              />
            </div>
          )}

          {canHostDash && (
            <Group title="Hosting">
              {isHost && (
                <>
                  <Row
                    href="/host-dashboard/experiences/new"
                    onClick={onClose}
                    icon={<PlusCircle className={ICON} />}
                    label="Create an experience"
                  />
                  <Row
                    href="/host-dashboard/experiences"
                    onClick={onClose}
                    icon={<CalendarCheck className={ICON} />}
                    label="My experiences"
                  />
                  <Row
                    href="/host-dashboard/messages"
                    onClick={onClose}
                    icon={<MessageSquare className={ICON} />}
                    label="Guest messages"
                  />
                  <Row
                    href="/host-dashboard/profile"
                    onClick={onClose}
                    icon={<UserRound className={ICON} />}
                    label="Host profile & photos"
                  />
                </>
              )}
              {hasCoHostInvites && (
                <Row
                  href="/host-dashboard/co-hosting"
                  onClick={onClose}
                  icon={<Users className={ICON} />}
                  label="Co-hosting"
                />
              )}
            </Group>
          )}

          <Group title="Account">
            <Row
              href={isHost ? "/host-dashboard/profile" : "/profile?edit=1"}
              onClick={onClose}
              icon={<Pencil className={ICON} />}
              label="Edit profile"
            />
            <Row
              onClick={() => {
                onClose();
                onChangeCity();
              }}
              icon={<MapPin className={ICON} />}
              label="Your city"
              value={city ?? "Not set"}
            />
            <Row
              href="/notifications"
              onClick={onClose}
              icon={<Bell className={ICON} />}
              label="Notifications"
            />
            {isHost && (
              <Row
                href="/profile?view=connections"
                onClick={onClose}
                icon={<Users className={ICON} />}
                label="Connections"
              />
            )}
            {isAdmin && (
              <Row
                href="/admin"
                onClick={onClose}
                icon={<ShieldCheck className={ICON} />}
                label="Admin dashboard"
              />
            )}
          </Group>

          <Group title="Help & safety">
            <Row
              href="/support"
              onClick={onClose}
              icon={<LifeBuoy className={ICON} />}
              label="Help centre"
            />
            <Row
              href="/host-guide"
              onClick={onClose}
              icon={<BookOpen className={ICON} />}
              label="Host Guide"
            />
            <Row
              href="/support/report"
              onClick={onClose}
              icon={<ShieldAlert className={ICON} />}
              label="Report a safety concern"
            />
            <Row
              href="/support/technical"
              onClick={onClose}
              icon={<Wrench className={ICON} />}
              label="Report a problem"
            />
            <Row
              href="mailto:support@myslotmate.com"
              onClick={onClose}
              icon={<Mail className={ICON} />}
              label="Contact us"
            />
          </Group>

          <Group title="About & legal">
            <Row
              href="/about"
              onClick={onClose}
              icon={<Info className={ICON} />}
              label="About Myslotmate"
            />
            <Row
              href="/blogs"
              onClick={onClose}
              icon={<Newspaper className={ICON} />}
              label="Stories"
            />
            <Row
              href="/support/terms-conditions"
              onClick={onClose}
              icon={<ScrollText className={ICON} />}
              label="Terms & conditions"
            />
            <Row
              href="/support/policies"
              onClick={onClose}
              icon={<FileText className={ICON} />}
              label="Privacy policy"
            />
          </Group>

          <button
            type="button"
            onClick={onLogout}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/[0.08] text-sm font-semibold text-rose-300 transition hover:bg-rose-500/[0.14]"
          >
            <LogOut className="h-4 w-4" /> Log out
          </button>
          <div className="mt-4 text-center">
            <Link
              href="/delete-account"
              onClick={onClose}
              className="text-[11px] text-white/35 transition hover:text-white/70"
            >
              Delete account
            </Link>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}

function Avatar({
  photo,
  name,
  className,
}: {
  photo: string | null;
  name: string | null;
  className: string;
}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1B1C33] ${className}`}
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo}
          alt=""
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="font-outfit text-sm font-bold text-[#D8B4FE]">
          {name?.[0]?.toUpperCase() ?? "?"}
        </span>
      )}
    </span>
  );
}

interface TileProps {
  href: string;
  icon: ReactNode;
  label: string;
}

function Tile({
  href,
  icon,
  label,
  onClick,
}: TileProps & { onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={() => {
        profileAction(href);
        onClick();
      }}
      className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/[0.06] bg-[#131328] px-1 py-3 text-center transition hover:border-white/15 hover:bg-[#1A1A35]"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#A020F0]/15 text-[#D8B4FE]">
        {icon}
      </span>
      <span className="w-full truncate text-[11px] font-semibold text-white/85">
        {label}
      </span>
    </Link>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-5">
      <p className="mb-2 px-1 text-[11px] font-bold tracking-wider text-white/40 uppercase">
        {title}
      </p>
      <div className="divide-y divide-white/[0.05] overflow-hidden rounded-2xl border border-white/[0.06] bg-[#131328]">
        {children}
      </div>
    </section>
  );
}

function Row({
  href,
  onClick,
  icon,
  label,
  value,
}: {
  href?: string;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  /** Current setting, shown on the right. */
  value?: string;
}) {
  const inner = (
    <>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-white/70">
        {icon}
      </span>
      <span className="flex-1 text-left">{label}</span>
      {value && (
        <span className="max-w-[40%] truncate text-xs text-white/45">
          {value}
        </span>
      )}
      <ChevronRight className="h-4 w-4 shrink-0 text-white/30" />
    </>
  );
  const cls =
    "flex w-full items-center gap-3 px-3.5 py-3 text-sm text-white/90 transition hover:bg-white/[0.04]";
  return href ? (
    <Link
      href={href}
      onClick={() => {
        profileAction(href);
        onClick();
      }}
      className={cls}
    >
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}
