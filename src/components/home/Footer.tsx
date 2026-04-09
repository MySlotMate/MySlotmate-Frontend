import Link from "next/link";
import { FaFacebook, FaInstagram, FaLinkedin } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
// Fixed the import to match the usage below
import { FiArrowRight } from "react-icons/fi"; 

const Footer = () => {
  return (
    <footer className="mt-4 w-full border-t border-[#aeddf873] bg-[linear-gradient(180deg,#dff2ff,#f4fbff)]">
      <div className="site-x">
        <div className="mx-auto w-full max-w-[1120px] py-10">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4"> {/* Increased to 4 columns for layout balance */}
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/home/logo.png" alt="Myslotmate" className="mb-3 h-10 w-auto" />
              <p className="text-sm text-[#5e88ab]">A product of Moodverse Pvt Ltd</p>
              <p className="mt-1 text-sm text-[#5e88ab]">support@myslotmate.com</p>
              
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

            <div className="flex flex-col justify-start items-start">
              <h4 className="text-sm font-bold text-[#16304c]">Subscribe</h4>
              <div className="mt-3 flex w-full flex-row items-center">
                <input 
                  type="text" 
                  placeholder="Get Product Updates" 
                  className="w-full rounded-l-2xl border border-r-0 border-[#aeddf873] bg-white px-4 py-2 text-sm text-[#0A142F] outline-none focus:ring-1 focus:ring-[#0094CA]" 
                />
                <button className="flex h-[38px] items-center bg-[#0094CA] px-3 rounded-r-2xl transition hover:bg-[#007ba8]">
                  {/* Added text-white here */}
                  <FiArrowRight className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col md:flex-row justify-between items-center border-t border-[#aeddf873] pt-4 text-sm text-[#5e88ab]">
            <div className="flex flex-row items-center justify-center gap-3">
              <a href="https://www.instagram.com/myslotmate/" target="_blank" rel="noopener noreferrer"><FaInstagram className="h-5 w-5"/></a>
              <a href="https://www.facebook.com/share/1E1dpBwZd3/" target="_blank" rel="noopener noreferrer"><FaFacebook className="h-5 w-5"/></a>
              <a href="https://www.linkedin.com/company/myslotmate/" target="_blank" rel="noopener noreferrer"><FaLinkedin className="h-5 w-5"/></a>      
              <a href="https://x.com/myslotmate?s=20" target="_blank" rel="noopener noreferrer"><FaXTwitter className="h-5 w-5"/></a>      
            </div>
            <p>A product of Moodverse PVT LTD</p>
            <p>© 2026 Myslotmate. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;