import { FiArrowRight } from 'react-icons/fi';
import { FaLinkedin, FaFacebookF, FaTwitter } from 'react-icons/fa';

const Footer = () => {
    return (
        <div className="p-7 flex flex-col items-center w-full justify-around rounded-t-2xl" style={{background: "linear-gradient(180deg, rgba(0, 148, 202, 0.1) 0%, rgba(255, 255, 255, 0.1) 100.13%)"}}>
            <div className="flex flex-col md:flex-row items-center justify-around w-full gap-1">
                <div className="flex flex-col items-center md:items-start justify-center text-[#1A1919] text-center md:text-left md:w-40 flex-shrink-0">
                    <img src="/assets/home/logo.png" alt="Logo" className="h-12 w-auto mb-2" />
                    <p className="text-sm">+91 9876543210</p>
                    <p className="text-sm">support@myslotmate.com</p>
                </div>
                <div className="flex flex-col items-center justify-center">
                    <h1 className="text-sm">Quick Links</h1>
                    <div className="flex flex-col items-center justify-center text-[0.75rem] text-[#1A1919]">
                        <a>About Us</a>
                        <a>Blogs</a>
                    </div>
                </div>
                <div className="flex flex-col items-center justify-center text-[0.75rem] text-[#1A1919]">
                    <a>Moments</a>
                    <a>Become a host</a>
                </div>
                <div className="flex flex-col items-center md:items-start justify-center">
                    <h1>Subscribe</h1>
                    <div className="flex flex-row items-center justify-center"><input type="text" className="bg-[#ffffff] h-[2rem] border-2 border-gray-500 p-2 rounded-l-lg outline-0" placeholder="Get product updates" /><button className="bg-[#0094CA] text-[#ffffff] py-2 px-4 h-[2rem] rounded-r-lg flex items-center gap-2"><FiArrowRight /></button></div>
                </div>
            </div>
            <hr />
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 mt-4">
                <div className="flex flex-row items-center justify-center gap-4">
                    <a href="#" aria-label="LinkedIn" className="text-[#1A1919] hover:text-[#0094CA]"><FaLinkedin size={20} /></a>
                    <a href="#" aria-label="Facebook" className="text-[#1A1919] hover:text-[#0094CA]"><FaFacebookF size={20} /></a>
                    <a href="#" aria-label="Twitter" className="text-[#1A1919] hover:text-[#0094CA]"><FaTwitter size={20} /></a>
                </div>
                <p className="text-[#4c4c4c] text-sm">A product of MOODVERSE pvt Ltd</p>
                <p className="text-[#4c4c4c] text-sm">@2025 Myslotmate. All rights reserved.</p>
            </div>
        </div>
    );
}
export default Footer;