import Link from "next/link";
import { FaInstagram } from "react-icons/fa";

const Footer = () => {
  return (
    <footer className="mt-4 w-full border-t border-[#aeddf873] bg-[linear-gradient(180deg,#dff2ff,#f4fbff)]">
      <div className="site-x">
        <div className="mx-auto w-full max-w-[1120px] py-10">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/home/logomyslotmate.jpeg" alt="Myslotmate" className="mb-3 h-10 w-auto" />
              <p className="text-sm text-[#5e88ab]">A product of Moodverse Pvt Ltd</p>
              <p className="mt-1 text-sm text-[#5e88ab]">support@myslotmate.com</p>
              <a
                href="https://www.instagram.com/myslotmate/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow MySlotMate on Instagram"
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#a9daf5] bg-white px-3 py-2 text-xs font-bold text-[#336f9b] shadow-[0_10px_24px_rgba(74,141,194,0.10)] transition hover:-translate-y-0.5 hover:text-[#0e8ae0]"
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-[linear-gradient(135deg,#1fa7ff,#63ceff)] text-white">
                  <FaInstagram className="h-4 w-4" />
                </span>
                @myslotmate
              </a>
            </div>

            <div>
              <h4 className="text-sm font-bold text-[#16304c]">Quick Links</h4>
              <div className="mt-3 space-y-2 text-sm text-[#5e88ab]">
                <Link href="/support" className="block hover:text-[#0e8ae0]">Safety</Link>
                <Link href="/support/terms-conditions" className="block hover:text-[#0e8ae0]">Guidelines</Link>
                <Link href="/hosts" className="block hover:text-[#0e8ae0]">Community</Link>
                <Link href="/blogs" className="block hover:text-[#0e8ae0]">Blog & Stories</Link>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-[#16304c]">For Hosts</h4>
              <div className="mt-3 space-y-2 text-sm text-[#5e88ab]">
                <Link href="/become-host" className="block hover:text-[#0e8ae0]">List Your Time</Link>
                <Link href="/host-dashboard" className="block hover:text-[#0e8ae0]">Host Corner</Link>
                <Link href="/experiences" className="block hover:text-[#0e8ae0]">Stories</Link>
              </div>
            </div>

          </div>

          <div className="mt-8 border-t border-[#aeddf873] pt-4 text-sm text-[#5e88ab]">
            <p>@2026 Myslotmate. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;


