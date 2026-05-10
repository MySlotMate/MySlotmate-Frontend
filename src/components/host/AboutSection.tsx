"use client";

import { useState } from "react";

export default function AboutSection({
  first_name,
  bio,
  expertise_tags,
  moods,
}: {
  first_name: string;
  bio: string | null;
  expertise_tags: string[];
  moods: string[];
}) {
  const [expanded, setExpanded] = useState(false);
  const aboutText = bio ?? "";

  // Color map for expertise tags (cycles through these)
  const tagColors = ["#0094CA", "#E85D3A", "#7B61FF", "#2ECC71", "#F5A623"];

  return (
    <div className="flex flex-col gap-6">
      {/* About */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">About {first_name}</h2>
        {aboutText && (
          <>
            <div className="mt-3 text-sm leading-relaxed text-gray-600 italic">
              {expanded ? (
                <p style={{ whiteSpace: "pre-line" }}>{aboutText}</p>
              ) : (
                <p>
                  {aboutText.slice(0, 250)}
                  {aboutText.length > 250 ? "..." : ""}
                </p>
              )}
            </div>
            {aboutText.length > 250 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="mt-2 flex items-center gap-1 text-sm font-semibold text-[#0094CA] hover:underline"
              >
                {expanded ? "Show less" : "Read more"}
                <span
                  className={`transition-transform ${expanded ? "rotate-180" : ""}`}
                >
                  ▾
                </span>
              </button>
            )}
          </>
        )}
      </div>

      {/* Host Vibes — derived from expertise_tags */}
      {expertise_tags.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-900">Host Vibes</h3>
          <div className="mt-3 flex flex-wrap gap-3">
            {expertise_tags.map((tag, i) => {
              const color = tagColors[i % tagColors.length]!;
              const label = tag.startsWith("#") ? tag.slice(1) : tag;
              return (
                <span
                  key={tag}
                  className="rounded-full border px-4 py-1.5 text-sm font-medium"
                  style={{ borderColor: color, color }}
                >
                  ✦ {label}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Moods */}
      {moods.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-900">Moods</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {moods.map((mood) => (
              <span
                key={mood}
                className="rounded-full bg-[#e6f8ff] px-4 py-1.5 text-sm font-medium text-[#0094CA] capitalize"
              >
                {mood}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
