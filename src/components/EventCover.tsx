"use client";

import { useState, type ReactNode } from "react";
import { FiImage } from "react-icons/fi";
import { MOOD_THEMES, type CategoryTheme } from "~/lib/categoryTheme";

const PALETTE = Object.values(MOOD_THEMES);

/** The event's mood colours, or a stable pick from the mood palette. */
function themeFor(seed: string, mood?: string | null): CategoryTheme {
  const byMood = mood ? MOOD_THEMES[mood.toLowerCase()] : undefined;
  if (byMood) return byMood;
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length]!;
}

/**
 * An event's cover photo, or a branded empty state when it has none (or the
 * image fails to load). Never substitutes a stock photo: a placeholder that
 * looks like a real cover misleads guests and hides the gap from hosts.
 *
 * `className` sizes and shapes whichever element renders, so it drops in for
 * an `<img>`. `children` replace the default icon in the empty state.
 *
 * `blurFill` keeps the whole photo visible inside a fixed frame (e.g. 4:5):
 * the photo is shrunk to fit and the leftover space is filled with a blurred,
 * enlarged copy of itself instead of bars or cropping.
 */
export default function EventCover({
  src,
  alt = "",
  seed = "",
  mood,
  className = "",
  iconSize = "md",
  loading = "lazy",
  blurFill = false,
  imgClassName = "",
  children,
}: {
  src?: string | null;
  alt?: string;
  /** Picks the colour when there is no mood: pass the title or id. */
  seed?: string;
  mood?: string | null;
  className?: string;
  iconSize?: "sm" | "md" | "lg";
  loading?: "lazy" | "eager";
  blurFill?: boolean;
  /** With `blurFill`: extra classes for the sharp, fitted photo. */
  imgClassName?: string;
  children?: ReactNode;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (src && failedSrc !== src && blurFill) {
    return (
      <div className={`${className} relative overflow-hidden bg-[#121426]`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          aria-hidden="true"
          loading={loading}
          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-70 blur-xl"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          loading={loading}
          onError={() => setFailedSrc(src)}
          className={`relative h-full w-full object-contain ${imgClassName}`}
        />
      </div>
    );
  }

  if (src && failedSrc !== src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        loading={loading}
        className={className}
        onError={() => setFailedSrc(src)}
      />
    );
  }

  const t = themeFor(seed || alt, mood);
  const icon = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  }[iconSize];
  const chip = {
    sm: "p-1.5",
    md: "p-3",
    lg: "p-4",
  }[iconSize];

  return (
    <div
      role="img"
      aria-label={alt ? `${alt}, no cover photo` : "No cover photo"}
      className={`${className} flex flex-col items-center justify-center gap-2 text-center`}
      style={{
        backgroundColor: t.bg,
        backgroundImage: [
          "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)",
          `radial-gradient(120% 90% at 15% 0%, ${t.accent}40, transparent 60%)`,
          "radial-gradient(110% 90% at 100% 100%, rgba(160,32,240,0.28), transparent 60%)",
        ].join(","),
        backgroundSize: "14px 14px, 100% 100%, 100% 100%",
      }}
    >
      {children ?? (
        <span
          className={`rounded-full border border-white/15 bg-white/10 ${chip}`}
          style={{ color: t.accent }}
        >
          <FiImage className={icon} aria-hidden />
        </span>
      )}
    </div>
  );
}
