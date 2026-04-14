"use client";

import Link from "next/link";
import { FaFacebook, FaInstagram, FaLinkedin } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { FiArrowRight } from "react-icons/fi";
import { BecomeHostModal } from "~/components/become-host";
import { useListTimeAction } from "~/hooks/useListTimeAction";

const Footer = () => {
  const { closeBecomeHostModal, handleListTimeClick, showBecomeHostModal } =
    useListTimeAction();

  return (
    <footer className="mt-4 w-full border-t border-[#aeddf873] bg-[linear-gradient(180deg,#dff2ff,#f4fbff)] pb-[env(safe-area-inset-bottom)]">
      <div className="site-x">
        <div className="mx-auto w-full max-w-[1120px] py-10">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            <div className="flex flex-col items-center text-center md:items-start md:text-left">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/home/logo.png"
                alt="Myslotmate"
                loading="lazy"
                className="mb-3 h-10 w-auto"
              />
              <p className="text-sm text-[#5e88ab]">
                A product of Moodverse Pvt Ltd
              </p>
              <p className="mt-1 text-sm text-[#5e88ab]">
                support@myslotmate.com
              </p>
            </div>

            <div className="grid grid-cols-2 gap-8 md:col-span-2 md:grid-cols-2">
              <div className="flex w-full flex-col items-center text-center md:w-auto md:items-start md:text-left">
                <h4 className="text-sm font-bold text-[#16304c]">
                  Quick Links
                </h4>
                <div className="mt-3 space-y-2 text-sm text-[#5e88ab]">
                  <Link
                    href="/support"
                    className="block hover:text-[#0e8ae0]"
                  >
                    Safety
                  </Link>
                  <Link
                    href="/support/terms-conditions"
                    className="block hover:text-[#0e8ae0]"
                  >
                    Guidelines
                  </Link>
                  <Link
                    href="/hosts"
                    className="block hover:text-[#0e8ae0]"
                  >
                    Community
                  </Link>
                  <Link
                    href="/blogs"
                    className="block hover:text-[#0e8ae0]"
                  >
                    Blog & Stories
                  </Link>
                </div>
              </div>

              <div className="flex w-full flex-col items-center text-center md:w-auto md:items-start md:text-left">
                <h4 className="text-sm font-bold text-[#16304c]">For Hosts</h4>
                <div className="mt-3 space-y-2 text-sm text-[#5e88ab]">
                  <button
                    type="button"
                    onClick={handleListTimeClick}
                    className="block w-full text-center transition hover:text-[#0e8ae0] md:w-auto md:text-left"
                  >
                    List Your Time
                  </button>
                  <Link
                    href="/host-dashboard"
                    className="block hover:text-[#0e8ae0]"
                  >
                    Host Corner
                  </Link>
                  <Link
                    href="/experiences"
                    className="block hover:text-[#0e8ae0]"
                  >
                    Stories
                  </Link>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-start text-center md:items-start md:text-left">
              <h4 className="text-sm font-bold text-[#16304c]">Subscribe</h4>
              <div className="mt-3 flex w-full flex-row items-center">
                <input
                  type="text"
                  placeholder="Get Product Updates"
                  suppressHydrationWarning
                  className="w-full rounded-l-2xl border border-r-0 border-[#aeddf873] bg-white px-4 py-2 text-sm text-[#0A142F] outline-none focus:ring-1 focus:ring-[#0094CA]"
                />
                <button
                  suppressHydrationWarning
                  className="flex h-[38px] items-center rounded-r-2xl bg-[#0094CA] px-3 transition hover:bg-[#007ba8]"
                >
                  <FiArrowRight className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center justify-between border-t border-[#aeddf873] pt-4 text-center text-sm text-[#000000] md:flex-row md:text-left">
            <p>MADE WITH &#x2764; FOR THE CURIOUS</p>
            <div className="mt-3 flex flex-row items-center justify-center gap-3 md:mt-0">
              <a
                href="https://www.instagram.com/myslotmate/"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border-2 border-[#7ea4bb73] p-2"
              >
                <FaInstagram className="h-5 w-5" />
              </a>
              <a
                href="https://www.facebook.com/share/1E1dpBwZd3/"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border-2 border-[#7ea4bb73] p-2"
              >
                <FaFacebook className="h-5 w-5" />
              </a>
              <a
                href="https://www.linkedin.com/company/myslotmate/"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border-2 border-[#7ea4bb73] p-2"
              >
                <FaLinkedin className="h-5 w-5" />
              </a>
              <a
                href="https://x.com/myslotmate?s=20"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border-2 border-[#7ea4bb73] p-2"
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
