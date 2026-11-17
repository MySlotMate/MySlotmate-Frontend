import {
  Baby,
  BookOpen,
  Briefcase,
  ChefHat,
  Code2,
  Dumbbell,
  Landmark,
  Languages,
  Leaf,
  Mountain,
  Music,
  Palette,
  Presentation,
  Shirt,
  Sparkles,
  TrendingUp,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import type { EventDTO } from "~/lib/api";

/**
 * Browse categories. Group experiences and 1:1 sessions have their own lists.
 *
 * Both are stored in the event's single `mood` field. `moods[0]` is the value
 * saved for new events; the rest are older or related values that also map
 * here, so events created before this split still land in a category.
 */

export type EventKind = "experience" | "session";

export interface Category {
  key: string;
  label: string;
  icon: LucideIcon;
  moods: string[];
  /** Mood whose illustration and colours this category borrows. */
  art?: string;
}

export const EXPERIENCE_CATEGORIES: Category[] = [
  {
    key: "adventure",
    label: "Adventure & Outdoors",
    icon: Mountain,
    moods: ["adventure", "adventurous"],
    art: "adventure",
  },
  {
    key: "social",
    label: "Social & Meetups",
    icon: Users,
    moods: ["social"],
    art: "social",
  },
  {
    key: "arts",
    label: "Arts & Crafts",
    icon: Palette,
    moods: ["creative"],
    art: "creative",
  },
  {
    key: "food",
    label: "Food & Drink",
    icon: UtensilsCrossed,
    moods: ["culinary", "foodie", "food"],
    art: "culinary",
  },
  {
    key: "culture",
    label: "Culture & Heritage",
    icon: Landmark,
    moods: ["cultural", "culture"],
    art: "cultural",
  },
  {
    key: "wellness",
    label: "Wellness & Calm",
    icon: Leaf,
    moods: ["wellness", "chill", "relaxing"],
    art: "wellness",
  },
  {
    key: "fitness",
    label: "Fitness & Sports",
    icon: Dumbbell,
    moods: ["fitness"],
    art: "fitness",
  },
  {
    key: "nightlife",
    label: "Music & Nightlife",
    icon: Music,
    moods: ["nightlife"],
    art: "nightlife",
  },
  {
    key: "workshops",
    label: "Workshops & Talks",
    icon: Presentation,
    moods: ["educational", "education", "intellectual"],
    art: "educational",
  },
  {
    key: "family",
    label: "Family & Kids",
    icon: Baby,
    moods: ["family", "kids"],
    art: "family",
  },
  {
    key: "fashion",
    label: "Fashion & Style",
    icon: Shirt,
    moods: ["fashion", "style"],
    art: "fashion",
  },
];

export const SESSION_CATEGORIES: Category[] = [
  {
    key: "career",
    label: "Career & Mentorship",
    icon: Briefcase,
    moods: ["career", "mentorship"],
  },
  {
    key: "tutoring",
    label: "Tutoring & Academics",
    icon: BookOpen,
    moods: ["tutoring", "educational", "education", "intellectual"],
  },
  {
    key: "languages",
    label: "Languages",
    icon: Languages,
    moods: ["languages", "language"],
  },
  {
    key: "music",
    label: "Music Lessons",
    icon: Music,
    moods: ["music", "nightlife"],
  },
  {
    key: "coaching",
    label: "Fitness Coaching",
    icon: Dumbbell,
    moods: ["coaching", "fitness"],
  },
  {
    key: "mindfulness",
    label: "Wellness & Mindfulness",
    icon: Leaf,
    moods: ["mindfulness", "wellness", "chill"],
  },
  {
    key: "design",
    label: "Art & Design",
    icon: Palette,
    moods: ["design", "creative", "fashion"],
  },
  {
    key: "tech",
    label: "Tech & Coding",
    icon: Code2,
    moods: ["tech", "coding"],
  },
  {
    key: "business",
    label: "Business & Finance",
    icon: TrendingUp,
    moods: ["business", "finance"],
  },
  {
    key: "cooking",
    label: "Cooking",
    icon: ChefHat,
    moods: ["cooking", "culinary", "foodie"],
  },
];

export const OTHER_CATEGORY: Category = {
  key: "other",
  label: "Something different",
  icon: Sparkles,
  moods: [],
};

export const kindOf = (e: Pick<EventDTO, "session_type">): EventKind =>
  e.session_type === "one_on_one" ? "session" : "experience";

export const categoriesFor = (kind: EventKind) =>
  kind === "session" ? SESSION_CATEGORIES : EXPERIENCE_CATEGORIES;

/** The category an event belongs to, within its own kind. */
export function categoryOf(
  e: Pick<EventDTO, "session_type" | "mood">,
): Category {
  const mood = (e.mood ?? "").trim().toLowerCase();
  return (
    categoriesFor(kindOf(e)).find((c) => c.moods.includes(mood)) ??
    OTHER_CATEGORY
  );
}

/** Label for any stored mood value, across both lists. */
export function categoryLabelForMood(mood: string): string | null {
  const m = mood.trim().toLowerCase();
  const hit =
    EXPERIENCE_CATEGORIES.find((c) => c.moods[0] === m) ??
    SESSION_CATEGORIES.find((c) => c.moods[0] === m);
  return hit?.label ?? null;
}
