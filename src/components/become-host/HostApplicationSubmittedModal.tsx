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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative mx-4 w-full max-w-md rounded-2xl bg-white px-8 py-10 shadow-xl">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition"
          aria-label="Close"
        >
          <FiX className="h-5 w-5" />
        </button>

        {/* Logo */}
          <div className="mb-5 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#0094CA]">{/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/home/logo.png"
              alt="Myslotmate"
              className="h-10 w-10 object-contain"
            />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-center text-xl font-bold text-gray-900">
          Host Request submitted
        </h2>

        {/* Subtitle */}
        <p className="mt-2 text-center text-sm text-gray-500">
          We&apos;ve received your application. Our team is currently reviewing your profile to ensure the best experience for our community.
        </p>

        {/* Timeline */}
        <div className="mt-8 space-y-0">
          {/* Step 1: Application Sent */}
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500">
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="h-10 w-0.5 bg-gray-200" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Application Sent</p>
              <p className="text-xs text-gray-500">{todayStr}</p>
            </div>
          </div>

          {/* Step 2: Internal Review */}
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#0094CA] bg-white">
                <div className="h-3 w-3 rounded-full bg-[#0094CA]" />
              </div>
              <div className="h-10 w-0.5 bg-gray-200" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Internal review</p>
              <p className="text-xs text-gray-500">Estimated: 24-48 hours</p>
            </div>
          </div>

          {/* Step 3: Final Approval */}
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-300 bg-white">
                <div className="h-3 w-3 rounded-full bg-gray-300" />
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-400">Final Approval</p>
              <p className="text-xs text-gray-400">Pending review completion</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => {
            onClose();
            router.push("/");
          }}
          className="mt-8 w-full rounded-full bg-[#0094CA] py-3.5 text-sm font-semibold text-white transition hover:bg-[#007dab]"
        >
          Continue Browsing Moments
        </button>

        {/* View profile */}
        <button
          onClick={onClose}
          className="mt-3 w-full text-center text-sm text-gray-500 hover:text-gray-700 transition"
        >
          View my profile
        </button>
      </div>
    </div>
  );
}
