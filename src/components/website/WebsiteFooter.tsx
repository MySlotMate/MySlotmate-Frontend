import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { FaInstagram, FaLinkedin } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Explore",
    links: [
      { href: "/experiences", label: "All events" },
      { href: "/about", label: "About MySlotMate" },
      { href: "/hosts", label: "Hosts" },
      { href: "/blogs", label: "Stories" },
    ],
  },
  {
    title: "Host",
    links: [
      { href: "/host-with-us", label: "Host with us" },
      { href: "/host-dashboard", label: "Host dashboard" },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "/support", label: "Support" },
      { href: "/support/terms-conditions", label: "Terms and conditions" },
      { href: "/privacy", label: "Privacy policy" },
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
];

/** Violet footer: closing line, links and socials. */
export default function WebsiteFooter() {
  return (
    <footer className="relative isolate w-full overflow-hidden bg-gradient-to-br from-[#7B2FFF] via-[#8420DC] to-[#6414AA] pb-[env(safe-area-inset-bottom)] text-white">
      <div className="mx-auto max-w-[1280px] px-5 pt-20 pb-10 md:px-10 md:pt-28">
        <div className="flex flex-col justify-between gap-10 md:flex-row md:items-center">
          <p className="font-outfit text-[clamp(32px,4vw,52px)] leading-[1.1] font-normal tracking-[-0.02em]">
            See you out there.
          </p>
          <Link
            href="/host-with-us"
            className="font-outfit flex h-14 w-fit shrink-0 items-center gap-2 rounded-2xl bg-white px-7 text-[17px] font-semibold text-[#7B2FFF] transition hover:bg-white/90"
          >
            Host with MySlotMate <ArrowUpRight className="h-5 w-5" />
          </Link>
        </div>

        <div className="mt-16 grid gap-12 border-t border-white/20 pt-14 sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div className="flex flex-col gap-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/brand/logo-horizontal-white.png"
              alt="MySlotMate"
              width={1048}
              height={209}
              className="h-10 w-fit"
            />
            <p className="max-w-[340px] text-base leading-relaxed text-white/80">
              Events, workshops and meetups across Northeast India, hosted by
              people who love what they do.
            </p>
            <div className="mt-1 flex gap-3">
              {SOCIALS.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25"
                >
                  <Icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title} className="flex flex-col gap-4">
              <span className="text-sm font-semibold tracking-[0.08em] text-white/65 uppercase">
                {col.title}
              </span>
              {col.links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-[17px] font-medium transition hover:text-white/75"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          ))}
        </div>

        <p className="mt-16 border-t border-white/20 pt-8 text-sm text-white/70">
          © {new Date().getFullYear()} MySlotMate
        </p>
      </div>
    </footer>
  );
}
