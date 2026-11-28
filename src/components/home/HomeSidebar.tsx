"use client";

import Link from "next/link";
import { Bell, Compass, Home, Medal, Plus, User } from "lucide-react";
import LocationButton from "~/components/LocationButton";
import { BecomeHostModal } from "~/components/become-host";
import { useListTimeAction } from "~/hooks/useListTimeAction";
import { useStoredAuth } from "~/hooks/useStoredAuth";
import { useMyProfile } from "~/hooks/useApi";
import { useNotifications } from "~/hooks/useNotifications";

type Active = "home" | "explore" | "journey" | "profile" | "notifications";

const LINKS: { key: Active; href: string; label: string }[] = [
  { key: "home", href: "/", label: "Home" },
  { key: "explore", href: "/explore", label: "Explore" },
  { key: "journey", href: "/activities", label: "My journey" },
];

const tab =
  "flex w-14 flex-col items-center gap-0.5 text-[11px] font-medium transition";
const idleTab = `${tab} text-white/55 hover:text-white`;

/**
 * App navigation for signed-in pages: a sticky top bar on tablets and up,
 * and the floating tab bar on phones. Mounted once in the root layout, in
 * normal flow above the page, so pages need no offset for it.
 * (The file keeps its old name so existing imports keep working.)
 */
export default function HomeSidebar({
  active = "home",
  tabBar = true,
}: {
  active?: Active;
  /** Detail pages hide it — their mobile layout has its own action bar. */
  tabBar?: boolean;
}) {
  const { closeBecomeHostModal, handleListTimeClick, showBecomeHostModal } =
    useListTimeAction();
  const { userId } = useStoredAuth();
  const { data: me } = useMyProfile(
    userId && userId !== "existing" ? userId : null,
  );
  // Some profiles store avatar_url = "" — treat it as missing.
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const avatar = me?.avatar_url || "/assets/home/avatar-placeholder.svg";
  const { unreadCount } = useNotifications();

  return (
    <>
      <header className="sticky top-0 z-[210] hidden border-b border-white/[0.06] bg-[#080914]/80 font-[family-name:var(--font-inter)] backdrop-blur-xl md:block">
        <div className="mx-auto flex h-[68px] w-full max-w-[1280px] items-center gap-6 px-6 lg:px-10">
          <Link href="/" aria-label="Myslotmate home" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/brand/logo-horizontal-white.png"
              alt="Myslotmate"
              width={1048}
              height={209}
              className="h-7 w-auto"
            />
          </Link>

          <nav aria-label="Main" className="flex items-center gap-1">
            {LINKS.map((l) => {
              const on = active === l.key;
              return (
                <Link
                  key={l.key}
                  href={l.href}
                  aria-current={on ? "page" : undefined}
                  className={`rounded-full px-3.5 py-2 text-[15px] font-medium whitespace-nowrap transition lg:px-4 ${
                    on
                      ? "bg-white/[0.08] text-white"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <LocationButton />
            <button
              type="button"
              onClick={handleListTimeClick}
              aria-label="Host an event"
              className="flex h-10 items-center gap-1.5 rounded-full bg-gradient-to-r from-[#7B2FFF] to-[#A020F0] px-3 text-sm font-semibold whitespace-nowrap text-white transition hover:brightness-110 lg:px-4"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden lg:inline">Host an event</span>
            </button>
            <Link
              href="/notifications"
              aria-label={
                unreadCount
                  ? `Notifications, ${unreadCount} unread`
                  : "Notifications"
              }
              aria-current={active === "notifications" ? "page" : undefined}
              className={`relative flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-white/10 hover:text-white ${active === "notifications" ? "bg-white/[0.08] text-white" : "text-white/75"}`}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#F43F5E] px-1 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
            <Link
              href="/profile"
              aria-label="Profile"
              aria-current={active === "profile" ? "page" : undefined}
              className={`rounded-full p-0.5 ring-2 transition ${active === "profile" ? "ring-[#A020F0]" : "ring-white/15 hover:ring-white/40"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatar}
                alt=""
                referrerPolicy="no-referrer"
                className="h-8 w-8 rounded-full object-cover"
              />
            </Link>
          </div>
        </div>
      </header>

      {/* Phones: no top bar, a floating tab bar at the bottom. */}
      <nav
        hidden={!tabBar}
        className="fixed inset-x-0 bottom-0 z-[210] border-t border-white/10 bg-[#080914]/90 px-4 pt-3 pb-[max(20px,env(safe-area-inset-bottom))] font-[family-name:var(--font-inter)] backdrop-blur-xl md:hidden"
      >
        <div className="flex h-16 items-center justify-around rounded-full border border-white/10 bg-[#121426] px-2">
          <Link
            href="/"
            aria-current={active === "home" ? "page" : undefined}
            className={active === "home" ? `${tab} text-[#D8B4FE]` : idleTab}
          >
            <Home className="h-5 w-5" /> Home
          </Link>
          <Link
            href="/explore"
            aria-current={active === "explore" ? "page" : undefined}
            className={active === "explore" ? `${tab} text-[#D8B4FE]` : idleTab}
          >
            <Compass className="h-5 w-5" /> Explore
          </Link>
          <button
            type="button"
            aria-label="Create"
            onClick={handleListTimeClick}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[#7038F5] to-[#B724EA] text-white shadow-[0_6px_20px_rgba(183,36,234,0.45)]"
          >
            <Plus className="h-6 w-6" />
          </button>
          <Link
            href="/activities"
            aria-current={active === "journey" ? "page" : undefined}
            className={active === "journey" ? `${tab} text-[#D8B4FE]` : idleTab}
          >
            <Medal className="h-5 w-5" /> Journey
          </Link>
          <Link
            href="/profile"
            aria-current={active === "profile" ? "page" : undefined}
            className={active === "profile" ? `${tab} text-[#D8B4FE]` : idleTab}
          >
            <User className="h-5 w-5" /> Profile
          </Link>
        </div>
      </nav>

      <BecomeHostModal
        open={showBecomeHostModal}
        onClose={closeBecomeHostModal}
      />
    </>
  );
}
