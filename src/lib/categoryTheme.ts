/**
 * Colour theme + illustration for every browse category on the app home:
 * the moods ("Pick your vibe") and the quick picks (Today, Free, …).
 *
 * `bg` is the illustration's flat background, so a tile painted in it blends
 * seamlessly into the art. `accent` is the category's highlight colour (count
 * badge, focus ring); `ink` is readable text on top of `accent` (the tile colour itself).
 * Illustrations were made in Adobe Firefly to match the About page set.
 */

export interface CategoryTheme {
  bg: string;
  accent: string;
  ink: string;
  /** Illustration path; categories without one fall back to an event cover. */
  art?: string;
}

const ART = "/assets/illustrations/categories";

export const MOOD_THEMES: Record<string, CategoryTheme> = {
  adventure: {
    bg: "#0D4232",
    accent: "#34D399",
    ink: "#0D4232",
    art: `${ART}/adventure.webp`,
  },
  social: {
    bg: "#511333",
    accent: "#F472B6",
    ink: "#511333",
    art: `${ART}/social.webp`,
  },
  wellness: {
    bg: "#0E4442",
    accent: "#2DD4BF",
    ink: "#0E4442",
    art: `${ART}/wellness.webp`,
  },
  creative: {
    bg: "#491A10",
    accent: "#FB7A5C",
    ink: "#491A10",
    art: `${ART}/creative.webp`,
  },
  chill: {
    bg: "#0E3754",
    accent: "#7DD3FC",
    ink: "#0E3754",
    art: `${ART}/chill.webp`,
  },
  educational: {
    bg: "#1E1E4F",
    accent: "#818CF8",
    ink: "#1E1E4F",
    art: `${ART}/educational.webp`,
  },
  culinary: {
    bg: "#3D2F02",
    accent: "#F5B700",
    ink: "#3D2F02",
    art: `${ART}/culinary.webp`,
  },
  cultural: {
    bg: "#390A10",
    accent: "#FACC15",
    ink: "#390A10",
    art: `${ART}/cultural.webp`,
  },
  foodie: {
    bg: "#430807",
    accent: "#F87171",
    ink: "#430807",
    art: `${ART}/foodie.webp`,
  },
  intellectual: {
    bg: "#122E57",
    accent: "#60A5FA",
    ink: "#122E57",
    art: `${ART}/intellectual.webp`,
  },
  nightlife: {
    bg: "#28115D",
    accent: "#A78BFA",
    ink: "#28115D",
    art: `${ART}/nightlife.webp`,
  },
  fashion: {
    bg: "#580943",
    accent: "#E879F9",
    ink: "#580943",
    art: `${ART}/fashion.webp`,
  },
  fitness: {
    bg: "#223406",
    accent: "#A3E635",
    ink: "#223406",
    art: `${ART}/fitness.webp`,
  },
  family: {
    bg: "#4C1D0B",
    accent: "#FDBA74",
    ink: "#4C1D0B",
    art: `${ART}/family.webp`,
  },
};

export const QUICK_THEMES: Record<string, CategoryTheme> = {
  today: {
    bg: "#4E2100",
    accent: "#F59E0B",
    ink: "#4E2100",
    art: `${ART}/q-today.webp`,
  },
  tomorrow: {
    bg: "#621330",
    accent: "#FB7185",
    ink: "#621330",
    art: `${ART}/q-tomorrow.webp`,
  },
  weekend: {
    bg: "#280E5C",
    accent: "#C084FC",
    ink: "#280E5C",
    art: `${ART}/q-weekend.webp`,
  },
  free: {
    bg: "#0A543F",
    accent: "#34D399",
    ink: "#0A543F",
    art: `${ART}/q-free.webp`,
  },
  budget: {
    bg: "#1B2956",
    accent: "#60A5FA",
    ink: "#1B2956",
    art: `${ART}/q-budget.webp`,
  },
  online: {
    bg: "#083E50",
    accent: "#22D3EE",
    ink: "#083E50",
    art: `${ART}/q-online.webp`,
  },
  oneonone: {
    bg: "#390958",
    accent: "#E879F9",
    ink: "#390958",
    art: `${ART}/q-oneonone.webp`,
  },
};

const FALLBACK: CategoryTheme = {
  bg: "#241333",
  accent: "#D8B4FE",
  ink: "#241333",
};

export const moodTheme = (key: string) => MOOD_THEMES[key] ?? FALLBACK;
export const quickTheme = (key: string) => QUICK_THEMES[key] ?? FALLBACK;
