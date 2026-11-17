"use client";

import { type PublicHostProfileDTO } from "~/lib/api";
import { FaInstagram, FaLinkedinIn } from "react-icons/fa";
import { FiGlobe } from "react-icons/fi";
import { MdVerified } from "react-icons/md";
import { IoLocationSharp } from "react-icons/io5";
import { HiArrowRight } from "react-icons/hi";

export default function ProfileHeader({
  host,
  onViewExperiences,
}: {
  host: PublicHostProfileDTO;
  onViewExperiences?: () => void;
}) {
  const fullName = `${host.first_name} ${host.last_name}`;

  const socialLinks = [
    host.social_instagram
      ? {
          key: "instagram",
          url: host.social_instagram,
          icon: <FaInstagram className="h-4 w-4" />,
        }
      : null,
    host.social_linkedin
      ? {
          key: "linkedin",
          url: host.social_linkedin,
          icon: <FaLinkedinIn className="h-4 w-4" />,
        }
      : null,
    host.social_website
      ? {
          key: "website",
          url: host.social_website,
          icon: <FiGlobe className="h-4 w-4" />,
        }
      : null,
  ].filter(Boolean) as { key: string; url: string; icon: React.ReactNode }[];

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-[#121426] p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      {/* Left: Avatar + Info */}
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
        {/* Avatar */}
        <div className="relative h-24 w-24 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={host.avatar_url ?? "/assets/home/avatar-placeholder.svg"}
            alt={fullName}
            loading="lazy"
            className="h-24 w-24 rounded-full border-4 border-[#121426] object-cover shadow-md"
          />
          {host.is_identity_verified && (
            <MdVerified className="absolute right-0 bottom-0 h-6 w-6 text-[#D8B4FE]" />
          )}
          {host.avatar_from_instagram && (
            <span
              title="Photo from Instagram"
              className="absolute top-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-[#121426] text-[#E1306C] shadow ring-1 ring-black/5"
            >
              <FaInstagram className="h-3.5 w-3.5" />
            </span>
          )}
        </div>

        {/* Name, tagline, location */}
        <div className="text-center sm:text-left">
          <h1 className="text-2xl font-bold text-white">{fullName}</h1>
          {host.tagline && (
            <p className="mt-1 text-sm text-[#A5A8C3]">
              <span className="mr-1 text-[#D8B4FE]">✦</span>
              {host.tagline}
            </p>
          )}
          {host.city && (
            <p className="mt-1 flex items-center justify-center gap-1 text-sm text-[#A5A8C3] sm:justify-start">
              <IoLocationSharp className="h-4 w-4 text-[#777B98]" />
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
                  className="rounded-full p-1.5 text-[#A5A8C3] transition hover:bg-white/[0.06] hover:text-[#D8B4FE]"
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
          className="flex items-center gap-2 rounded-full bg-[#A020F0] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#007aa8]"
        >
          View Live Experiences
          <HiArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
