"use client";

import { useRouter } from "next/navigation";
import { FiX } from "react-icons/fi";

interface HostApplicationSubmittedModalProps {
  open: boolean;
  onClose: () => void;
}

export default function HostApplicationSubmittedModal({
  open,
  onClose,
}: HostApplicationSubmittedModalProps) {
  const router = useRouter();

  if (!open) return null;

  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const todayStr = `Today ${timeStr}`;

  return (
    <div className="msm-modal fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4">
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[20px] border border-white/10 bg-[#131328] px-6 py-8 text-white shadow-2xl sm:px-8 sm:py-10">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/45 transition hover:text-white/70"
          aria-label="Close"
        >
          <FiX className="h-5 w-5" />
        </button>

        {/* Logo */}
        <div className="mb-5 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#9B30FF] bg-[#241333]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/brand/logo-mark.png"
              alt="Myslotmate"
              className="h-9 w-9 object-contain"
            />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-center text-xl font-bold text-white">
          Host Request submitted
        </h2>

        {/* Subtitle */}
        <p className="mt-2 text-center text-sm text-white/55">
          We&apos;ve received your application. Our team is currently reviewing
          your profile to ensure the best experience for our community.
        </p>

        {/* Timeline */}
        <div className="mt-8 space-y-0">
          {/* Step 1: Application Sent */}
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500">
                <svg
                  className="h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div className="h-10 w-0.5 bg-white/15" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                Application Sent
              </p>
              <p className="text-xs text-white/55">{todayStr}</p>
            </div>
          </div>

          {/* Step 2: Internal Review */}
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#9B30FF] bg-[#131328]">
                <div className="h-3 w-3 rounded-full bg-[#9B30FF]" />
              </div>
              <div className="h-10 w-0.5 bg-white/15" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                Internal review
              </p>
              <p className="text-xs text-white/55">Estimated: 24-48 hours</p>
            </div>
          </div>

          {/* Step 3: Final Approval */}
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white/20 bg-[#131328]">
                <div className="h-3 w-3 rounded-full bg-white/20" />
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-white/45">
                Final Approval
              </p>
              <p className="text-xs text-white/45">Pending review completion</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => {
            onClose();
            router.push("/");
          }}
          className="mt-8 w-full rounded-full bg-gradient-to-r from-[#7038F5] to-[#B724EA] py-3.5 text-sm font-semibold text-white transition hover:brightness-110"
        >
          Continue Browsing Moments
        </button>

        {/* View profile */}
        <button
          onClick={onClose}
          className="mt-3 w-full text-center text-sm text-white/55 transition hover:text-white"
        >
          View my profile
        </button>
      </div>
    </div>
  );
}
