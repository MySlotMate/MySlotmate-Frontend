"use client";

import Link from "next/link";
import { FaFacebook, FaInstagram, FaLinkedin } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { FiArrowRight } from "react-icons/fi";
import { BecomeHostModal } from "~/components/become-host";
import { useListTimeAction } from "~/hooks/useListTimeAction";

const Footer = ({ dark = false }: { dark?: boolean } = {}) => {
  const { closeBecomeHostModal, handleListTimeClick, showBecomeHostModal } =
    useListTimeAction();
  // One dark palette everywhere (the `dark` prop only changes the grid).
  const c = {
    footer: "border-white/5 bg-[#0B0C18]",
    heading: "text-white",
    text: "text-white/55",
    hover: "hover:text-[#D4ABFF]",
    divider: "border-white/10",
    bottom: "text-white/60",
    icon: "border-white/15 text-white/70 hover:border-[#9B30FF] hover:text-white",
    input:
      "border-white/10 bg-[#131425] text-white placeholder:text-white/40 focus:ring-[#9B30FF]",
    button: "bg-gradient-to-r from-[#8B1CF6] to-[#D61CF2] hover:brightness-110",
  };

  return (
    <footer
      className={`mt-4 w-full border-t pb-[env(safe-area-inset-bottom)] ${c.footer}`}
    >
      <div className="site-x">
        <div className="mx-auto w-full max-w-[1120px] py-10">
          <div
            className={`grid grid-cols-1 gap-8 ${dark ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-4"}`}
          >
            <div className="flex flex-col items-center text-center md:items-start md:text-left">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/brand/logo-horizontal-white.png"
                alt="MySlotMate"
                width={1048}
                height={209}
                className="mb-3 h-8 w-auto"
              />
              <p className={`text-sm ${c.text}`}>
                A product of Moodverse Pvt Ltd
              </p>
              <p className={`mt-1 text-sm ${c.text}`}>support@myslotmate.com</p>
            </div>

            <div
              className={`grid grid-cols-2 gap-8 md:col-span-2 md:grid-cols-2 ${dark ? "max-lg:md:order-last" : ""}`}
            >
              <div className="flex w-full flex-col items-center text-center md:w-auto md:items-start md:text-left">
                <h4 className={`text-sm font-bold ${c.heading}`}>
                  Quick Links
                </h4>
                <div className={`mt-3 space-y-2 text-sm ${c.text}`}>
                  <Link href="/support" className={`block ${c.hover}`}>
                    Safety
                  </Link>
                  <Link
                    href="/support/terms-conditions"
                    className={`block ${c.hover}`}
                  >
                    Guidelines
                  </Link>
                  <Link href="/hosts" className={`block ${c.hover}`}>
                    Community
                  </Link>
                  <Link href="/blogs" className={`block ${c.hover}`}>
                    Blog & Stories
                  </Link>
                </div>
              </div>

              <div className="flex w-full flex-col items-center text-center md:w-auto md:items-start md:text-left">
                <h4 className={`text-sm font-bold ${c.heading}`}>For Hosts</h4>
                <div className={`mt-3 space-y-2 text-sm ${c.text}`}>
                  <button
                    type="button"
                    onClick={handleListTimeClick}
                    className={`block w-full text-center transition md:w-auto md:text-left ${c.hover}`}
                  >
                    List Your Time
                  </button>
                  <Link href="/host-dashboard" className={`block ${c.hover}`}>
                    Host Corner
                  </Link>
                  <Link href="/experiences" className={`block ${c.hover}`}>
                    Stories
                  </Link>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-start text-center md:items-start md:text-left">
              <h4 className={`text-sm font-bold ${c.heading}`}>Subscribe</h4>
              <div className="mt-3 flex w-full flex-row items-center">
                <input
                  type="text"
                  placeholder="Get Product Updates"
                  suppressHydrationWarning
                  className={`w-full rounded-l-2xl border border-r-0 px-4 py-2 text-sm outline-none focus:ring-1 ${c.input}`}
                />
                <button
                  suppressHydrationWarning
                  className={`flex h-[38px] items-center rounded-r-2xl px-3 transition ${c.button}`}
                >
                  <FiArrowRight className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>
          </div>

          <div
            className={`mt-8 flex flex-col items-center justify-between border-t pt-4 text-center text-sm md:flex-row md:text-left ${c.divider} ${c.bottom}`}
          >
            <p>MADE WITH &#x2764; FOR THE CURIOUS</p>
            <div className="mt-3 flex flex-row items-center justify-center gap-3 md:mt-0">
              <a
                href="https://www.instagram.com/myslotmate/"
                target="_blank"
                rel="noopener noreferrer"
                className={`rounded-full border-2 p-2 transition ${c.icon}`}
              >
                <FaInstagram className="h-5 w-5" />
              </a>
              <a
                href="https://www.facebook.com/share/1E1dpBwZd3/"
                target="_blank"
                rel="noopener noreferrer"
                className={`rounded-full border-2 p-2 transition ${c.icon}`}
              >
                <FaFacebook className="h-5 w-5" />
              </a>
              <a
                href="https://www.linkedin.com/company/myslotmate/"
                target="_blank"
                rel="noopener noreferrer"
                className={`rounded-full border-2 p-2 transition ${c.icon}`}
              >
                <FaLinkedin className="h-5 w-5" />
              </a>
              <a
                href="https://x.com/myslotmate?s=20"
                target="_blank"
                rel="noopener noreferrer"
                className={`rounded-full border-2 p-2 transition ${c.icon}`}
              >
                <FaXTwitter className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </div>
      <BecomeHostModal
        open={showBecomeHostModal}
        onClose={closeBecomeHostModal}
      />
    </footer>
  );
};

export default Footer;
