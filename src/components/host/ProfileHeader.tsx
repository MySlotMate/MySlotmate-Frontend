"use client";

import { type PublicHostProfileDTO } from "~/lib/api";
import { FaInstagram, FaLinkedinIn } from "react-icons/fa";
import { FiGlobe } from "react-icons/fi";
import { MdVerified } from "react-icons/md";
import { IoLocationSharp } from "react-icons/io5";
import { FiMessageSquare } from "react-icons/fi";
import { HiArrowRight } from "react-icons/hi";

export default function ProfileHeader({ 
  host,
  onViewExperiences,
  onWriteReview,
}: { 
  host: PublicHostProfileDTO;
  onViewExperiences?: () => void;
  onWriteReview?: () => void;
}) {
  const fullName = `${host.first_name} ${host.last_name}`;

  const socialLinks = [
    host.social_instagram
      ? { key: "instagram", url: host.social_instagram, icon: <FaInstagram className="h-4 w-4" /> }
      : null,
    host.social_linkedin
      ? { key: "linkedin", url: host.social_linkedin, icon: <FaLinkedinIn className="h-4 w-4" /> }
      : null,
    host.social_website
      ? { key: "website", url: host.social_website, icon: <FiGlobe className="h-4 w-4" /> }
      : null,
  ].filter(Boolean) as { key: string; url: string; icon: React.ReactNode }[];

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      {/* Left: Avatar + Info */}
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
        {/* Avatar */}
        <div className="relative h-24 w-24 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={host.avatar_url ?? "/assets/home/avatar-placeholder.png"}
            alt={fullName}
            className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-md"
          />
          {host.is_identity_verified && (
            <MdVerified className="absolute bottom-0 right-0 h-6 w-6 text-[#0094CA]" />
          )}
        </div>

        {/* Name, tagline, location */}
        <div className="text-center sm:text-left">
          <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
          {host.tagline && (
            <p className="mt-1 flex items-center justify-center gap-1 text-sm text-gray-600 sm:justify-start">
              <span className="text-[#0094CA]">✦</span>
              {host.tagline}
            </p>
          )}
          {host.city && (
            <p className="mt-1 flex items-center justify-center gap-1 text-sm text-gray-500 sm:justify-start">
              <IoLocationSharp className="h-4 w-4 text-gray-400" />
              {host.city}
            </p>
          )}
          {/* Social links */}
          {socialLinks.length > 0 && (
            <div className="mt-3 flex items-center justify-center gap-3 sm:justify-start">
              {socialLinks.map((link) => (
                <a
                  key={link.key}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full p-1.5 text-gray-600 transition hover:bg-gray-100 hover:text-[#0094CA]"
                >
                  {link.icon}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Buttons */}
      <div className="flex flex-col items-center gap-3 sm:items-end">
        <button 
          onClick={onViewExperiences}
          className="flex items-center gap-2 rounded-full bg-[#0094CA] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#007aa8]"
        >
          View Live Experiences
          <HiArrowRight className="h-4 w-4" />
        </button>
        {/* Write a Review button commented out */}
        {/* <button 
          onClick={onWriteReview}
          className="flex items-center gap-2 rounded-full border-2 border-gray-300 px-6 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-[#0094CA] hover:text-[#0094CA]"
        >
          <FiMessageSquare className="h-4 w-4" />
          Write a Review
        </button> */}
      </div>
    </div>
  );
}
