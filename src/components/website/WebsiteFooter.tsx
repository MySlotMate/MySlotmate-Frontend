import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { FaInstagram, FaLinkedin } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Explore",
    links: [
      { href: "/experiences", label: "All experiences" },
      { href: "/hosts", label: "Hosts" },
      { href: "/blogs", label: "Stories" },
    ],
  },
  {
    title: "Host",
    links: [
      { href: "/become-host", label: "Become a host" },
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

/** Violet footer with the big faded wordmark (Offlyn-style). */
export default function WebsiteFooter() {
  return (
    <footer className="relative isolate w-full overflow-hidden bg-gradient-to-br from-[#7B2FFF] via-[#8420DC] to-[#6414AA] pb-[env(safe-area-inset-bottom)] text-white">
      <span
        aria-hidden
        className="font-outfit pointer-events-none absolute -bottom-[0.22em] left-1/2 -z-10 -translate-x-1/2 text-[clamp(96px,21vw,300px)] leading-none font-extrabold tracking-[-0.04em] whitespace-nowrap text-white/10 select-none"
      >
        MySlotMate
      </span>

      <div className="mx-auto max-w-[1280px] px-5 pt-16 pb-10 md:px-10 md:pt-20">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-center">
          <p className="font-outfit text-[clamp(32px,4.4vw,48px)] leading-[1.1] font-bold">
            Step outside.
            <br />
            <span className="text-white/60">
              Someone’s time is waiting for you.
            </span>
          </p>
          <Link
            href="/become-host"
            className="font-outfit flex h-12 w-fit items-center gap-1.5 rounded-xl bg-white px-5 text-[15px] font-semibold text-[#7B2FFF] transition hover:bg-white/90"
          >
            Host with MySlotMate <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-12 grid gap-10 border-t border-white/20 pt-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="flex flex-col gap-3">
            <span className="font-outfit text-2xl font-bold">MySlotMate</span>
            <p className="max-w-[300px] text-sm leading-relaxed text-white/80">
              Book people’s time. Experiences, communities and expertise from
              real people near you.
            </p>
            <div className="mt-1 flex gap-2">
              {SOCIALS.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title} className="flex flex-col gap-3">
              <span className="text-[13px] font-semibold text-white/70">
                {col.title}
              </span>
              {col.links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-[15px] font-medium transition hover:text-white/75"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          ))}
        </div>

        <p className="mt-16 text-[13px] text-white/70 md:mt-24">
          © {new Date().getFullYear()} MySlotMate
        </p>
      </div>
    </footer>
  );
}
