import Link from "next/link";
import { FaFacebook, FaInstagram, FaLinkedin } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

/**
 * The one footer for the whole site, signed in or out. The app's
 * `Home.Footer` renders this too, so the two can't drift apart again.
 */

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Discover",
    links: [
      { href: "/experiences", label: "Explore events" },
      { href: "/about", label: "About us" },
      { href: "/become-host", label: "Become a host" },
      { href: "/host-with-us", label: "How hosting works" },
      { href: "/host-dashboard", label: "Host dashboard" },
    ],
  },
  {
    title: "Quick links",
    links: [
      { href: "/support/policies", label: "Guidelines" },
      { href: "/hosts", label: "Community" },
      { href: "/blogs", label: "Blogs & stories" },
      { href: "/support", label: "Safety" },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "/support", label: "Support" },
      { href: "/support/terms-conditions", label: "Terms" },
      { href: "/privacy", label: "Privacy" },
      { href: "mailto:support@myslotmate.com", label: "Email us" },
    ],
  },
];

const SOCIALS = [
  {
    href: "https://www.instagram.com/myslotmate/",
    label: "Instagram",
    Icon: FaInstagram,
  },
  {
    href: "https://www.linkedin.com/company/myslotmate/",
    label: "LinkedIn",
    Icon: FaLinkedin,
  },
  { href: "https://x.com/myslotmate?s=20", label: "X", Icon: FaXTwitter },
  {
    href: "https://www.facebook.com/share/1E1dpBwZd3/",
    label: "Facebook",
    Icon: FaFacebook,
  },
];

/** Quiet dark footer: brand, three link columns, one small bottom line. */
export default function WebsiteFooter({
  className = "",
}: {
  className?: string;
}) {
  const link = "w-fit text-sm text-white/55 transition hover:text-white";
  return (
    <footer
      className={`w-full border-t border-white/[0.06] bg-[#080914] pb-[env(safe-area-inset-bottom)] text-white ${className}`}
    >
      <div className="mx-auto max-w-[1280px] px-5 py-10 md:px-10 md:py-12">
        <div className="flex flex-col gap-8 lg:flex-row lg:justify-between">
          {/* Brand */}
          <div className="flex flex-col gap-4 lg:max-w-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/brand/logo-horizontal-white.png"
              alt="MySlotMate"
              width={1048}
              height={209}
              className="h-7 w-fit opacity-90"
            />
            <p className="text-sm leading-relaxed text-white/50">
              Events, workshops and meetups across Northeast India. See you out
              there.
            </p>
            <div className="flex gap-1">
              {SOCIALS.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-white/50 transition hover:bg-white/[0.06] hover:text-white"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div className="grid grid-cols-3 gap-x-6 gap-y-8 sm:gap-x-12 lg:gap-x-16">
            {COLUMNS.map((col) => (
              <nav
                key={col.title}
                aria-label={col.title}
                className="flex flex-col gap-2.5"
              >
                <span className="mb-1 text-xs font-medium text-white/85">
                  {col.title}
                </span>
                {col.links.map((l) =>
                  l.href.startsWith("mailto:") ? (
                    <a key={l.label} href={l.href} className={link}>
                      {l.label}
                    </a>
                  ) : (
                    <Link key={l.label} href={l.href} className={link}>
                      {l.label}
                    </Link>
                  ),
                )}
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-1 border-t border-white/[0.06] pt-5 text-xs text-white/40 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} MySlotMate</p>
          <p>A product of Moodverse Private Limited</p>
        </div>
      </div>
    </footer>
  );
}
