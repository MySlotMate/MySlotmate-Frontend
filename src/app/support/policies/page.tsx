"use client";
import Link from "next/link";
import { useState } from "react";
import { FiArrowLeft, FiChevronDown, FiSearch, FiArrowRight, FiCheckCircle, FiMaximize2 } from "react-icons/fi";
import { 
  MdBusinessCenter,
  MdEventBusy,
  MdAttachMoney,
  MdGroups,
  MdSecurityUpdateGood,
  MdOutlineCopyright,
  MdPets,
  MdPhotoCameraFront,
  MdOutlineWifi,
  MdMovieCreation,
  MdAutoAwesome,
  MdElectricBolt
} from "react-icons/md";

// --- User's Existing Interfaces & Data ---
interface PolicySection {
  id: number;
  title: string;
  icon: string;
  content: {
    heading: string;
    items: string[];
  }[];
}

const policySections: PolicySection[] = [
  {
    id: 1,
    title: "Booking Policies",
    icon: "📅",
    content: [
      {
        heading: "Booking Confirmation",
        items: [
          "Bookings are confirmed once payment is received",
          "You'll receive a confirmation email with slot details",
          "Cancellations must be made 24 hours before the experience",
          "Late cancellations may incur a cancellation fee",
        ],
      },
      {
        heading: "Rescheduling",
        items: [
          "Reschedule for free if done 48 hours in advance",
          "Limited reschedule options after 48 hours",
          "Contact our support team for urgent rescheduling needs",
        ],
      },
    ],
  },
  {
    id: 2,
    title: "Cancellation Policy",
    icon: "🚫",
    content: [
      {
        heading: "Cancellation by Participant",
        items: [
          "Full refund if cancelled more than 48 hours before",
          "50% refund if cancelled 24-48 hours before",
          "No refund if cancelled less than 24 hours before",
          "Emergency cancellations may be eligible for refund",
        ],
      },
      {
        heading: "Host Cancellation",
        items: [
          "Host must provide at least 48 hours notice",
          "Participant receives full refund + 10% credit",
          "Emergency cancellations are handled case-by-case",
        ],
      },
    ],
  },
  {
    id: 3,
    title: "Payout Schedule",
    icon: "💰",
    content: [
      {
        heading: "Earnings & Payouts",
        items: [
          "Earnings are calculated after 5% platform fee",
          "Payouts are processed every 7 days",
          "Minimum payout threshold is $25",
          "Direct bank transfer to your registered account",
        ],
      },
      {
        heading: "Payment Hold",
        items: [
          "Payments are held for 48 hours after experience",
          "This allows time for dispute resolution",
          "Review the holding window in your dashboard",
        ],
      },
    ],
  },
  {
    id: 4,
    title: "Host Responsibilities",
    icon: "🎯",
    content: [
      {
        heading: "During the Experience",
        items: [
          "Start the experience on time",
          "Maintain a safe and respectful environment",
          "Follow all community guidelines",
          "Be responsive to participant needs",
        ],
      },
      {
        heading: "Cancellation Penalties",
        items: [
          "Repeated cancellations may result in account suspension",
          "Last-minute cancellations affect your rating",
          "Provide valid reasons for cancellations",
        ],
      },
    ],
  },
];

// --- New Interfaces for Cards ---
interface PolicyCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  linkText?: string;
  isUpdated?: boolean;
  isActive?: boolean;
  children?: React.ReactNode;
}

interface QuickLinkProps {
  icon: React.ReactNode;
  title: string;
}

// --- New Card Components ---
const PolicyCard: React.FC<PolicyCardProps> = ({
  icon,
  title,
  description,
  linkText = "Read summary",
  isUpdated = false,
  isActive = false,
  children
}) => {
  return (
    <div 
      className={`flex flex-col p-6 bg-white rounded-2xl border transition-all duration-200 hover:shadow-md ${
        isActive ? 'border-[#0094CA] shadow-sm ring-1 ring-[#e4f8ff]' : 'border-gray-100 shadow-sm'
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center justify-center w-12 h-12 bg-[#e4f8ff] text-[#0094CA] rounded-xl">
          {icon}
        </div>
        {isUpdated && (
          <span className="flex items-center px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-md">
            Updated
          </span>
        )}
      </div>

      <div className="flex flex-col grow">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 leading-relaxed mb-6 grow">
          {description}
        </p>

        {children && <div className="mb-4 flex flex-col">{children}</div>}

        <div className="flex items-center mt-auto">
          {!children && (
            <button className="flex items-center text-sm font-medium text-[#0094CA] hover:text-[#007dab] group">
              {linkText}
                <FiArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const QuickLink: React.FC<QuickLinkProps> = ({ icon, title }) => {
  return (
    <div className="flex items-center p-4 space-x-3 bg-gray-50 hover:bg-gray-100 rounded-xl cursor-pointer transition-colors duration-200 border border-transparent hover:border-gray-200">
      <div className="flex items-center justify-center text-gray-400">
        {icon}
      </div>
      <span className="text-sm font-medium text-gray-700">{title}</span>
    </div>
  );
};

// --- Main Page Component ---
export default function PoliciesPage() {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const handleToggle = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-[#e4f8ff] to-white w-full">
      {/* Note: Changed max-w-4xl to max-w-6xl so the 3-column grid has enough room to breathe,
        while still keeping your header centered nicely.
      */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 sm:py-12 max-w-6xl mx-auto w-full">
        
        {/* Back Button */}
        <Link
          href="/support"
          className="inline-flex items-center gap-2 text-[#0094CA] hover:text-[#007dab] mb-6 font-medium"
        >
          <FiArrowLeft className="h-5 w-5" />
          Back to Support
        </Link>

        {/* Header */}
        <div className="mb-12 flex flex-col items-center gap-2 justify-center text-center">
          <h1 className="text-3xl sm:text-4xl font-semibold text-gray-900 mb-2">
            Platform Policies & <span className="text-[#0094CA]">Guidelines</span>
          </h1>
          <p className="text-gray-500 max-w-2xl">
            We believe in transparency. Here is everything you need to know about
            hosting responsibly, keeping our community safe, and understanding
            how we work together.
          </p>
        </div>

        {/* Search Bar */}
        <div className="flex flex-col items-center justify-center">
          <div className="flex flex-row items-center justify-center bg-[#ffffff] shadow-sm shadow-[#6d6d6d6b] rounded-full w-full md:w-[80%] lg:w-[60%] border border-gray-100">
            <FiSearch color="#94A3B8" size={20} className="ml-4" />
            <input 
              type="text" 
              placeholder="Search for articles, errors or anything you need..." 
              className="rounded-full py-3 px-4 text-[#474956] border-0 bg-transparent outline-0 w-full focus:ring-0" 
            />
          </div>
        </div>

        {/* --- NEW SECTION STARTS HERE --- */}
        {/* Substantial gap added with mt-24 */}
        <div className="mt-24 w-full flex flex-col space-y-12">
          
          {/* Main Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            <PolicyCard
              icon={<MdBusinessCenter className="w-6 h-6" />}
              title="Hosting Guidelines"
              description="Standards for creating a welcoming space, check-in procedures, and maintaining quality..."
            />

            {/* Special Active Card with Inner Children */}
            <PolicyCard
              icon={<MdEventBusy className="w-6 h-6" />}
              title="Cancellation Policy"
              description="How refunds, rescheduling, and host cancellations are handled to ensure fairness."
              isUpdated={true}
              isActive={true}
            >
              {/* Inner Gray Box for Plain English Summary */}
              <div className="flex flex-col bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Plain English Summary
                </span>
                <ul className="flex flex-col space-y-3">
                  <li className="flex items-start text-sm text-gray-600">
                    <FiCheckCircle className="w-4 h-4 text-[#0094CA] mr-2 mt-0.5 shrink-0" />
                    <span>Guests get full refund if canceled 48h prior.</span>
                  </li>
                  <li className="flex items-start text-sm text-gray-600">
                    <FiCheckCircle className="w-4 h-4 text-[#0094CA] mr-2 mt-0.5 shrink-0" />
                    <span>Host cancellations may incur a fee.</span>
                  </li>
                </ul>
              </div>
              {/* Action Links for Cancellation Card */}
              <div className="flex items-center justify-between mt-2">
                <button className="flex items-center text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors">
                  <FiMaximize2 className="w-3 h-3 mr-1.5" />
                  Expand legal details
                </button>
                <button className="text-sm font-medium text-[#0094CA] hover:text-[#007dab] transition-colors">
                  View Full Policy
                </button>
              </div>
            </PolicyCard>

            <PolicyCard
              icon={<MdAttachMoney className="w-6 h-6" />}
              title="Payment & Fees"
              description="Understanding payout schedules, service fees, taxes, and currency conversion."
            />

            <PolicyCard
              icon={<MdGroups className="w-6 h-6" />}
              title="Community Standards"
              description="Our commitment to inclusion, non-discrimination, and respectful behavior."
            />

            <PolicyCard
              icon={<MdSecurityUpdateGood className="w-6 h-6" />}
              title="Safety & Conduct"
              description="Emergency procedures, prohibited items, and ensuring guest wellbeing."
            />

            <PolicyCard
              icon={<MdOutlineCopyright className="w-6 h-6" />}
              title="Content & IP"
              description="Rights regarding photos, descriptions, and user-generated content on the platform."
            />

          </div>

          {/* Frequently Requested Section */}
          <div className="flex flex-col p-6 lg:p-8 bg-white border border-gray-100 shadow-sm rounded-3xl">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Frequently Requested</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <QuickLink icon={<MdPets className="w-5 h-5" />} title="Pet Policy Guidelines" />
              <QuickLink icon={<MdPhotoCameraFront className="w-5 h-5" />} title="Photography Rules" />
              <QuickLink icon={<MdOutlineWifi className="w-5 h-5" />} title="Internet Usage Policy" />
              <QuickLink icon={<MdMovieCreation className="w-5 h-5" />} title="Security Camera Disclosure" />
              <QuickLink icon={<MdAutoAwesome className="w-5 h-5" />} title="Cleaning Standards" />
              <QuickLink icon={<MdElectricBolt className="w-5 h-5" />} title="Instant Book Rules" />
            </div>
          </div>
          
        </div>

      </main>
    </div>
  );
}