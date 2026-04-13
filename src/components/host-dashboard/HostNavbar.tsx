"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "~/utils/firebase";
import { FiBell } from "react-icons/fi";

const NAV_LINKS = [
  { label: "Overview", href: "/host-dashboard" },
  { label: "Calendar", href: "/host-dashboard/calendar" },
  { label: "Messages", href: "/host-dashboard/messages" },
  { label: "Earnings", href: "/host-dashboard/earnings" },
] as const;

export default function HostNavbar() {
  const pathname = usePathname();
  const [user] = useAuthState(auth);

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between site-x">
        {/* Logo */}
        <Link href="/" className="shrink-0">{/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/home/logo.png"
            alt="Myslotmate"
            className="h-9 w-auto"
          />
        </Link>

        {/* Nav links — desktop */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map(({ label, href }) => {
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
                  <span className="absolute -bottom-[1.19rem] left-0 right-0 h-[2px] rounded bg-[#0094CA]" />
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

          {/* Avatar */}
          {user && (
            <Link href="/host-dashboard/profile">{/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={user.photoURL ?? "/assets/home/avatar-placeholder.png"}
                alt={user.displayName ?? "Profile"}
                className="h-9 w-9 rounded-full border-2 border-[#0094CA] object-cover"
                referrerPolicy="no-referrer"
              />
            </Link>
          )}
        </div>
      </div>

      {/* Mobile nav links */}
      <div className="flex md:hidden items-center gap-1 overflow-x-auto border-t border-gray-100 site-x hide-scrollbar">
        {NAV_LINKS.map(({ label, href }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`whitespace-nowrap px-3 py-2.5 text-xs font-medium transition ${
                active
                  ? "border-b-2 border-[#0094CA] text-[#0094CA]"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

