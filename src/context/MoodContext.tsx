"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { normalizeMood } from "~/lib/moods";

export const MOOD_TABS = [
  "All",
  "Adventurous",
  "Social",
  "Wellness",
  "Educational",
  "Creative",
  "Relaxing",
  "Culinary",
  "Cultural",
] as const;

export type MoodTab = (typeof MOOD_TABS)[number];

type MoodContextValue = {
  selectedMood: MoodTab;
  setSelectedMood: (mood: MoodTab) => void;
  selectedMoodKey: string;
};

const MoodContext = createContext<MoodContextValue | null>(null);

export const MoodProvider = ({ children }: { children: ReactNode }) => {
  const [selectedMood, setSelectedMood] = useState<MoodTab>("All");

  const value = useMemo(
    () => ({
      selectedMood,
      setSelectedMood,
      selectedMoodKey: normalizeMood(selectedMood),
    }),
    [selectedMood],
  );

  return <MoodContext.Provider value={value}>{children}</MoodContext.Provider>;
};

export const useMood = () => {
  const context = useContext(MoodContext);
  if (!context) {
    throw new Error("useMood must be used within MoodProvider");
  }
  return context;
};

export { normalizeMood } from "~/lib/moods";
