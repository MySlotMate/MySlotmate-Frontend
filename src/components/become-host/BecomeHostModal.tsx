"use client";

import { useRouter } from "next/navigation";
import { FiX } from "react-icons/fi";

interface BecomeHostModalProps {
  open: boolean;
  onClose: () => void;
}

export default function BecomeHostModal({ open, onClose }: BecomeHostModalProps) {
  const router = useRouter();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative mx-4 w-full max-w-md rounded-2xl bg-white px-8 py-10 shadow-xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition"
          aria-label="Close"
        >
          <FiX className="h-5 w-5" />
        </button>

        {/* Icon */}
        <div className="mb-5 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e6f8ff]">
            <svg
              className="h-8 w-8 text-[#0094CA]"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-center text-xl font-bold text-gray-900">
          Become a Host on Myslotmate
        </h2>

        {/* Subtitle */}
        <p className="mt-2 text-center text-sm text-gray-500">
          Host activities that bring people together. Meet new faces while earning money.
        </p>

        {/* Benefits */}
        <div className="mt-6 space-y-5">
          {/* Benefit 1 */}
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#e6f8ff]">
              <svg className="h-4 w-4 text-[#0094CA]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Host meaningful experiences</p>
              <p className="text-xs text-gray-500">
                Design activities that reflect your unique personality and expertise.
              </p>
            </div>
          </div>

          {/* Benefit 2 */}
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-900">
              <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Earn per slot</p>
              <p className="text-xs text-gray-500">
                Get paid for every participant who joins your curated sessions.
              </p>
            </div>
          </div>

          {/* Benefit 3 */}
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-900">
              <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Build your local community</p>
              <p className="text-xs text-gray-500">
                Connect with locals and foster new friendships in your area.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => {
            onClose();
            router.push("/become-host");
          }}
          className="mt-8 w-full rounded-full bg-[#0094CA] py-3.5 text-sm font-semibold text-white transition hover:bg-[#007dab]"
        >
          Request to Become a Host
        </button>

        {/* Not now */}
        <button
          onClick={onClose}
          className="mt-3 w-full text-center text-sm text-gray-500 hover:text-gray-700 transition"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
