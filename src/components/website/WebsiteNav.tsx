"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useStoredAuth } from "~/hooks/useStoredAuth";
import { Menu, X } from "lucide-react";
import GoogleLogin from "~/components/GoogleLogin";
import { BecomeHostModal } from "~/components/become-host";
import { useListTimeAction } from "~/hooks/useListTimeAction";

const LINKS = [
  { href: "/#discover", label: "Discover" },
  { href: "/about", label: "About" },
  { href: "/host-with-us", label: "Host with us" },
  { href: "/blogs", label: "Stories" },
];

/**
 * Top bar for the logged-out website. Sits over the hero. Signed-in people
 * get the app's own navigation (mounted in the root layout) instead, so a
 * logged-in guest reading About never sees "Log in / Sign up".
 */
export default function WebsiteNav() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { closeBecomeHostModal, handleListTimeClick, showBecomeHostModal } =
    useListTimeAction();
  const { userId } = useStoredAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (mounted && userId) return null;

  return (
    <>
      <nav className="relative z-20 mx-auto flex w-full max-w-[1280px] items-center justify-between gap-4 px-5 py-5 md:px-10">
        <Link href="/" aria-label="MySlotMate home" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/brand/logo-horizontal-white.png"
            alt="MySlotMate"
            width={1048}
            height={209}
            className="h-7 w-auto md:h-8"
          />
        </Link>

        <div className="hidden items-center gap-8 text-[15px] font-medium text-white/65 lg:flex">
          {LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="transition hover:text-white"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleListTimeClick}
            className="font-outfit hidden h-10 items-center rounded-full bg-[#F8F7FF] px-5 text-[15px] font-semibold text-[#080914] transition hover:bg-white sm:flex"
          >
            Host an event
          </button>
          <button
            type="button"
            onClick={() => setLoginOpen(true)}
            className="h-10 rounded-full px-4 text-[15px] font-semibold whitespace-nowrap text-white transition hover:bg-white/10"
          >
            Log in<span className="hidden sm:inline"> / Sign up</span>
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#121426] text-white lg:hidden"
          >
            {menuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {menuOpen && (
          <div className="absolute top-full right-5 left-5 flex flex-col gap-1 rounded-2xl border border-white/10 bg-[#121426] p-3 shadow-2xl lg:hidden">
            {LINKS.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-4 py-3 text-[15px] font-medium text-white/80 hover:bg-white/5"
              >
                {l.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                handleListTimeClick();
              }}
              className="font-outfit mt-1 h-11 rounded-full bg-[#F8F7FF] text-[15px] font-semibold text-[#080914]"
            >
              Host an event
            </button>
          </div>
        )}
      </nav>

      {/* Rendered at the top of the page so the hero can't paint over it. */}
      {mounted &&
        createPortal(
          <>
            <GoogleLogin open={loginOpen} onClose={() => setLoginOpen(false)} />
            <BecomeHostModal
              open={showBecomeHostModal}
              onClose={closeBecomeHostModal}
            />
          </>,
          document.body,
        )}
    </>
  );
}
