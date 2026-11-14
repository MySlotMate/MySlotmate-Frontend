"use client";

import Link from "next/link";
import { Compass, Home, Medal, Plus, User } from "lucide-react";
import { BecomeHostModal } from "~/components/become-host";
import { useListTimeAction } from "~/hooks/useListTimeAction";

// Figma: "· Laptop 1280" frames use an 80px icon rail; "· Desktop 1440" frames
// the full 230px rail with labels. Labels stay as sr-only text on the rail.
const item =
  "flex h-14 w-14 items-center justify-center rounded-full text-[17px] font-medium text-white transition hover:bg-white/5 min-[80rem]:w-[190px] min-[80rem]:justify-start min-[80rem]:gap-3.5 min-[80rem]:px-[18px]";
const activeItem = `${item} bg-gradient-to-r from-[#2E1A4D] to-[#1E1335] text-[#E9D8FD] hover:bg-transparent`;
const label = "sr-only min-[80rem]:not-sr-only";
const tab =
  "flex w-14 flex-col items-center gap-0.5 text-[11px] font-medium transition";
const idleTab = `${tab} text-white/55 hover:text-white`;

/** Desktop-only left rail for the dark pages. */
export default function HomeSidebar({
  active = "home",
  tabBar = true,
}: {
  active?: "home" | "explore" | "journey" | "profile";
  /** Detail pages hide it — their mobile layout has its own action bar. */
  tabBar?: boolean;
}) {
  const { closeBecomeHostModal, handleListTimeClick, showBecomeHostModal } =
    useListTimeAction();

  return (
    <>
      <aside className="fixed top-0 bottom-0 left-0 z-[210] hidden w-20 flex-col items-center border-r border-white/[0.06] bg-[#0A0B17] pt-9 font-[family-name:var(--font-inter)] md:flex min-[80rem]:w-[230px] min-[80rem]:items-start min-[80rem]:pt-[38px] min-[80rem]:pl-[30px]">
        <Link
          href="/"
          aria-label="MySlotMate home"
          className="flex h-9 items-center"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/brand/logo-mark.png"
            alt="MySlotMate"
            className="h-10 w-10 min-[80rem]:hidden"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/brand/logo-horizontal-white.png"
            alt="MySlotMate"
            className="hidden h-8 w-auto min-[80rem]:block"
          />
        </Link>
        <nav className="mt-10 flex flex-col gap-4 min-[80rem]:mt-[38px]">
          <Link
            href="/"
            title="Home"
            aria-current={active === "home" ? "page" : undefined}
            className={active === "home" ? activeItem : item}
          >
            <Home
              className={`h-6 w-6 ${active === "home" ? "" : "text-white/70"}`}
            />
            <span className={label}>Home</span>
          </Link>
          <Link
            href="/explore"
            title="Explore"
            aria-current={active === "explore" ? "page" : undefined}
            className={active === "explore" ? activeItem : item}
          >
            <Compass
              className={`h-6 w-6 ${active === "explore" ? "" : "text-white/70"}`}
            />
            <span className={label}>Explore</span>
          </Link>
          <button
            type="button"
            title="Create"
            onClick={handleListTimeClick}
            className={`${item} bg-gradient-to-r from-[#7038F5] to-[#B724EA] hover:bg-transparent hover:brightness-110`}
          >
            <Plus className="h-6 w-6" />
            <span className={label}>Create</span>
          </button>
          <Link
            href="/activities"
            title="Journey"
            aria-current={active === "journey" ? "page" : undefined}
            className={active === "journey" ? activeItem : item}
          >
            <Medal
              className={`h-6 w-6 ${active === "journey" ? "" : "text-white/70"}`}
            />
            <span className={label}>Journey</span>
          </Link>
          <Link
            href="/profile"
            title="Profile"
            aria-current={active === "profile" ? "page" : undefined}
            className={active === "profile" ? activeItem : item}
          >
            <User
              className={`h-6 w-6 ${active === "profile" ? "" : "text-white/70"}`}
            />
            <span className={label}>Profile</span>
          </Link>
        </nav>
      </aside>

      {/* Figma "· Mobile 390": no top bar, a floating tab bar at the bottom. */}
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
