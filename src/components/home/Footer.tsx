import { FiArrowRight } from 'react-icons/fi';
import { FaLinkedin, FaFacebookF, FaTwitter } from 'react-icons/fa';
import Link from 'next/link';

const Footer = () => {
    return (
        <footer className="w-full" style={{background: "linear-gradient(180deg, rgba(0, 148, 202, 0.1) 0%, rgba(255, 255, 255, 0.1) 100.13%)"}}>
            <div className="mx-auto w-full max-w-7xl site-x py-8">
                <div className="grid grid-cols-1 gap-8 text-center md:grid-cols-4 md:text-left">
                    <div className="flex flex-col items-center md:items-start text-[#1A1919]">
                    <img src="/assets/home/logo.png" alt="Logo" className="h-12 w-auto mb-2" />
                    <p className="text-sm">+91 9876543210</p>
                    <p className="text-sm">support@myslotmate.com</p>
                </div>

                <div className="flex flex-col items-center md:items-start text-[#1A1919]">
                    <h1 className="text-sm">Quick Links</h1>
                    <div className="flex flex-col items-center md:items-start text-[0.75rem]">
                        <a>About Us</a>
                        <a>Blogs</a>
                    </div>
                </div>

                <div className="flex flex-col items-center md:items-start text-[0.75rem] text-[#1A1919]">
                    <a>Moments</a>
                    <Link href="/become-host" className="hover:text-[#0094CA] transition">Become a host</Link>
                </div>

                <div className="flex flex-col items-center md:items-start">
                    <h1>Subscribe</h1>
                    <div className="flex flex-row items-center justify-center md:justify-start"><input type="text" className="bg-[#ffffff] h-[2rem] border-2 border-gray-500 p-2 rounded-l-lg outline-0" placeholder="Get product updates" suppressHydrationWarning /><button className="bg-[#0094CA] text-[#ffffff] py-2 px-4 h-[2rem] rounded-r-lg flex items-center gap-2" suppressHydrationWarning><FiArrowRight /></button></div>
                </div>
                </div>

                <hr className="my-6 border-[#d8ebf3]" />

                <div className="flex flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left">
                <div className="flex flex-row items-center gap-4">
                    <a href="#" aria-label="LinkedIn" className="text-[#1A1919] hover:text-[#0094CA]"><FaLinkedin size={20} /></a>
                    <a href="#" aria-label="Facebook" className="text-[#1A1919] hover:text-[#0094CA]"><FaFacebookF size={20} /></a>
                    <a href="#" aria-label="Twitter" className="text-[#1A1919] hover:text-[#0094CA]"><FaTwitter size={20} /></a>
                </div>
                <p className="text-[#4c4c4c] text-sm">A product of MOODVERSE pvt Ltd</p>
                <p className="text-[#4c4c4c] text-sm">@2025 Myslotmate. All rights reserved.</p>
            </div>
            </div>
        </footer>
    );
}
export default Footer;
