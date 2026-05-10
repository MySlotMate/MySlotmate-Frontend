"use client";

import { useEffect, useState } from "react";

const words = ["Discover hosts", "Book experiences", "Become a host"];

export default function Preloader() {
  const [isVisible, setIsVisible] = useState(true);
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    // Hide preloader after page content loads
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 700);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // show words one by one while preloader is visible
    if (!isVisible) return;
    if (wordIndex >= words.length - 1) return;

    const id = setTimeout(() => {
      setWordIndex((i) => i + 1);
    }, 200);

    return () => clearTimeout(id);
  }, [wordIndex, isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-[#f0f9ff] via-white to-[#f8fcff]">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-[#0094CA]/5 to-transparent blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-tr from-[#e6f8ff]/40 to-transparent blur-3xl" />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Logo Container with animations */}
        <div className="relative h-32 w-32 md:h-40 md:w-40">
          {/* Outer rotating ring (slower) */}
          <div
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#0094CA] border-r-[#0094CA]/40 opacity-70"
            style={{ animation: "spin 6s linear infinite" }}
          />

          {/* Middle pulsing ring (larger + visible) */}
          <div
            className="absolute inset-2 rounded-full border border-[#0094CA]/20 opacity-80"
            style={{ animation: "ringPulse 2.4s ease-in-out infinite" }}
          />

          {/* Inner logo container */}
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Round logo with gentle float/scale/rotate animation */}
            <img
              src="/assets/navbar/roundlogo.png"
              alt="M logo"
              loading="lazy"
              className="h-24 w-24 transform-gpu rounded-full object-contain drop-shadow-lg md:h-32 md:w-32"
              style={{ animation: "logoFloat 2.6s ease-in-out infinite" }}
            />
          </div>
        </div>

        {/* Brand text with sequential word animation (larger) */}
        <div className="flex flex-col items-center gap-3">
          {/* Heading removed to avoid repeating brand text shown by the logo */}

          <div className="relative h-8">
            {words.map((w, i) => (
              <div
                key={w}
                className={`word absolute left-1/2 text-center text-lg font-extrabold text-[#0f3b57] md:text-2xl ${i === wordIndex ? "visible" : "invisible"}`}
                style={{
                  transition: "opacity 260ms ease, transform 260ms ease",
                  transform:
                    i === wordIndex
                      ? "translate(-50%, 0)"
                      : "translate(-50%, 10px)",
                  opacity: i === wordIndex ? 1 : 0,
                }}
              >
                {w}
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        @keyframes bounce {
          0%,
          100% {
            opacity: 0.3;
            transform: translateY(0);
          }
          50% {
            opacity: 1;
            transform: translateY(-6px);
          }
        }

        @keyframes wordIn {
          0% {
            opacity: 0;
            transform: translateY(8px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-word-in {
          animation: wordIn 360ms ease forwards;
        }
        .word {
          position: absolute;
          transform: translate(-50%, 0);
        }

        /* slow spin for the outer ring */
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        /* ring pulse scale */
        @keyframes ringPulse {
          0% {
            transform: scale(1);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.08);
            opacity: 0.95;
          }
          100% {
            transform: scale(1);
            opacity: 0.6;
          }
        }

        /* subtle logo float + scale + rotate */
        @keyframes logoFloat {
          0% {
            transform: translateY(0) scale(1) rotate(0deg);
          }
          40% {
            transform: translateY(-6px) scale(1.06) rotate(4deg);
          }
          60% {
            transform: translateY(-3px) scale(1.03) rotate(-2deg);
          }
          100% {
            transform: translateY(0) scale(1) rotate(0deg);
          }
        }
      `}</style>
    </div>
  );
}
