const moodAliasMap: Record<string, string> = {
  all: "all",
  adventurous: "adventure",
  adventure: "adventure",
  social: "social",
  wellness: "wellness",
  educational: "educational",
  education: "educational",
  creative: "creative",
  relaxing: "chill",
  chill: "chill",
  culinary: "culinary",
  culture: "cultural",
  cultural: "cultural",
  foodie: "foodie",
  food: "foodie",
  romantic: "romantic",
  intellectual: "intellectual",
  nightlife: "nightlife",
};

const moodDisplayMap: Record<string, string> = {
  all: "All",
  adventure: "Adventure",
  social: "Social",
  wellness: "Wellness",
  educational: "Educational",
  creative: "Creative",
  chill: "Relaxing",
  culinary: "Culinary",
  cultural: "Cultural",
  foodie: "Foodie",
  romantic: "Romantic",
  intellectual: "Intellectual",
  nightlife: "Nightlife",
};

const moodSortOrder = [
  "all",
  "adventure",
  "social",
  "wellness",
  "creative",
  "chill",
  "educational",
  "culinary",
  "cultural",
  "foodie",
  "romantic",
  "intellectual",
  "nightlife",
] as const;

const toTitleCase = (value: string) =>
  value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export const normalizeMood = (mood: string | null | undefined): string => {
  const cleaned = (mood ?? "").trim().toLowerCase();
  return moodAliasMap[cleaned] ?? cleaned;
};

export const getMoodDisplayLabel = (mood: string): string => {
  const normalizedMood = normalizeMood(mood);
  return moodDisplayMap[normalizedMood] ?? toTitleCase(normalizedMood);
};

export const compareMoods = (leftMood: string, rightMood: string): number => {
  const left = normalizeMood(leftMood);
  const right = normalizeMood(rightMood);

  const leftIndex = moodSortOrder.indexOf(
    left as (typeof moodSortOrder)[number],
  );
  const rightIndex = moodSortOrder.indexOf(
    right as (typeof moodSortOrder)[number],
  );

  if (leftIndex !== -1 || rightIndex !== -1) {
    if (leftIndex === -1) return 1;
    if (rightIndex === -1) return -1;
    if (leftIndex !== rightIndex) return leftIndex - rightIndex;
  }

  return getMoodDisplayLabel(left).localeCompare(getMoodDisplayLabel(right));
};
