import type { BookingDTO, EventDTO } from "~/lib/api";
import { categoryOf, kindOf } from "~/lib/categories";
import { formatIST } from "~/lib/datetime";

/**
 * Journey milestone badges.
 *
 * Computed on the client from the guest's completed bookings for now. The
 * same rules are written up for the backend in docs/journey-badges.md, so the
 * server can award them (and notify) once that endpoint exists.
 */

export interface Moment {
  booking: BookingDTO;
  event: EventDTO;
  /** When the session happened. */
  at: Date;
}

export interface BadgeDef {
  key: string;
  name: string;
  /** How to earn it, shown while locked. */
  how: string;
  /** Short line shown once earned. */
  earnedLine: (m: Moment) => string;
  art: string;
  /** How many qualifying moments are needed. */
  target: number;
  /** Which completed moments count toward it. */
  counts: (m: Moment, all: Moment[]) => boolean;
  /** Badges judged on the whole history rather than single moments. */
  progress?: (all: Moment[]) => { current: number; earnedAt?: Moment };
}

export interface BadgeState {
  def: BadgeDef;
  earned: boolean;
  current: number;
  /** The moment that unlocked it. */
  earnedAt?: Moment;
}

const ART = "/assets/badges";
const hourIST = (d: Date) => Number(formatIST(d, "H"));
const dayIST = (d: Date) => Number(formatIST(d, "i")); // 6 = Sat, 7 = Sun
const cat = (m: Moment) => categoryOf(m.event).key;

export const BADGES: BadgeDef[] = [
  {
    key: "first-step",
    name: "First Step",
    how: "Go to your first experience.",
    earnedLine: (m) => `It all started with ${m.event.title}.`,
    art: `${ART}/first-step.webp`,
    target: 1,
    counts: () => true,
  },
  {
    key: "weekend-wanderer",
    name: "Weekend Wanderer",
    how: "Spend a Saturday or Sunday at an experience.",
    earnedLine: (m) =>
      `A ${formatIST(m.at, "EEEE")} well spent at ${m.event.title}.`,
    art: `${ART}/weekend-wanderer.webp`,
    target: 1,
    counts: (m) => [6, 7].includes(dayIST(m.at)),
  },
  {
    key: "trailblazer",
    name: "Trailblazer",
    how: "Complete an adventure or outdoor experience.",
    earnedLine: (m) => `You took on ${m.event.title}.`,
    art: `${ART}/trailblazer.webp`,
    target: 1,
    counts: (m) => cat(m) === "adventure",
  },
  {
    key: "social-spark",
    name: "Social Spark",
    how: "Join 3 social meetups.",
    earnedLine: () => "Three meetups, a lot of new faces.",
    art: `${ART}/social-spark.webp`,
    target: 3,
    counts: (m) => cat(m) === "social",
  },
  {
    key: "made-by-hand",
    name: "Made by Hand",
    how: "Make something at an arts & crafts experience.",
    earnedLine: (m) => `You made something at ${m.event.title}.`,
    art: `${ART}/made-by-hand.webp`,
    target: 1,
    counts: (m) => cat(m) === "arts" || cat(m) === "design",
  },
  {
    key: "shared-table",
    name: "Shared Table",
    how: "Share a meal at a food & drink experience.",
    earnedLine: (m) => `Good food and good company at ${m.event.title}.`,
    art: `${ART}/shared-table.webp`,
    target: 1,
    counts: (m) => cat(m) === "food" || cat(m) === "cooking",
  },
  {
    key: "rooted",
    name: "Rooted",
    how: "Celebrate local culture and heritage.",
    earnedLine: (m) => `You celebrated culture at ${m.event.title}.`,
    art: `${ART}/rooted.webp`,
    target: 1,
    counts: (m) => cat(m) === "culture",
  },
  {
    key: "calm-corner",
    name: "Calm Corner",
    how: "Slow down at a wellness experience.",
    earnedLine: (m) => `You found some calm at ${m.event.title}.`,
    art: `${ART}/calm-corner.webp`,
    target: 1,
    counts: (m) => cat(m) === "wellness" || cat(m) === "mindfulness",
  },
  {
    key: "early-bird",
    name: "Early Bird",
    how: "Make it to an experience that starts between 5 and 9 am.",
    earnedLine: (m) => `Up and out by ${formatIST(m.at, "h:mm a")}.`,
    art: `${ART}/early-bird.webp`,
    target: 1,
    counts: (m) => hourIST(m.at) >= 5 && hourIST(m.at) < 9,
  },
  {
    key: "night-owl",
    name: "Night Owl",
    how: "Go to an experience that starts at 8 pm or later.",
    earnedLine: (m) => `A late one at ${m.event.title}.`,
    art: `${ART}/night-owl.webp`,
    target: 1,
    // Past midnight still counts as a late one, until 4 am.
    counts: (m) => hourIST(m.at) >= 20 || hourIST(m.at) < 4,
  },
  {
    key: "learner",
    name: "Always Learning",
    how: "Book your first 1:1 session.",
    earnedLine: (m) => `One-on-one time at ${m.event.title}.`,
    art: `${ART}/learner.webp`,
    target: 1,
    counts: (m) => kindOf(m.event) === "session",
  },
  {
    key: "plus-one",
    name: "Brought a Friend",
    how: "Book an experience for two or more people.",
    earnedLine: (m) => `You brought company to ${m.event.title}.`,
    art: `${ART}/plus-one.webp`,
    target: 1,
    counts: (m) => m.booking.quantity >= 2,
  },
  {
    key: "regular",
    name: "Regular",
    how: "Complete 5 experiences.",
    earnedLine: () => "Five experiences in. You're a regular now.",
    art: `${ART}/regular.webp`,
    target: 5,
    counts: () => true,
  },
  {
    key: "curious-mind",
    name: "Curious Mind",
    how: "Try 3 different kinds of experience.",
    earnedLine: () => "Three different worlds explored.",
    art: `${ART}/curious-mind.webp`,
    target: 3,
    counts: () => true,
    progress: (all) => {
      const seen = new Set<string>();
      for (const m of all) {
        const c = cat(m);
        if (c === "other" || seen.has(c)) continue;
        seen.add(c);
        if (seen.size === 3) return { current: 3, earnedAt: m };
      }
      return { current: seen.size };
    },
  },
  {
    key: "familiar-faces",
    name: "Familiar Faces",
    how: "Go back to the same host a second time.",
    earnedLine: (m) => `Back for more at ${m.event.title}.`,
    art: `${ART}/familiar-faces.webp`,
    target: 2,
    counts: () => true,
    progress: (all) => {
      const byHost = new Map<string, number>();
      let best = 0;
      for (const m of all) {
        const n = (byHost.get(m.event.host_id) ?? 0) + 1;
        byHost.set(m.event.host_id, n);
        best = Math.max(best, n);
        if (n === 2) return { current: 2, earnedAt: m };
      }
      return { current: best };
    },
  },
  {
    key: "ten-stories",
    name: "Ten Stories",
    how: "Complete 10 experiences.",
    earnedLine: () => "Ten experiences, ten stories to tell.",
    art: `${ART}/ten-stories.webp`,
    target: 10,
    counts: () => true,
  },
];

/** Work out every badge from completed moments (any order). */
export function computeBadges(moments: Moment[]): BadgeState[] {
  const all = [...moments].sort((a, b) => a.at.getTime() - b.at.getTime());
  return BADGES.map((def) => {
    if (def.progress) {
      const { current, earnedAt } = def.progress(all);
      return {
        def,
        current: Math.min(current, def.target),
        earned: current >= def.target,
        earnedAt,
      };
    }
    const hits = all.filter((m) => def.counts(m, all));
    const earnedAt =
      hits.length >= def.target ? hits[def.target - 1] : undefined;
    return {
      def,
      current: Math.min(hits.length, def.target),
      earned: Boolean(earnedAt),
      earnedAt,
    };
  });
}
