import type { EventDTO } from "~/lib/api";
import { compareMoods, normalizeMood } from "~/lib/moods";

export function buildUpcomingHostMoodMap(events?: EventDTO[] | null) {
  const hostMoodSets = new Map<string, Set<string>>();
  const now = Date.now();

  for (const event of events ?? []) {
    if (!event.host_id || !event.mood) continue;

    const eventTime = new Date(event.time).getTime();
    if (Number.isNaN(eventTime) || eventTime <= now) continue;

    const moodKey = normalizeMood(event.mood);
    if (!moodKey || moodKey === "all") continue;

    const existingMoods = hostMoodSets.get(event.host_id) ?? new Set<string>();
    existingMoods.add(moodKey);
    hostMoodSets.set(event.host_id, existingMoods);
  }

  return new Map(
    Array.from(hostMoodSets.entries()).map(([hostId, moods]) => [
      hostId,
      Array.from(moods).sort(compareMoods),
    ]),
  );
}

export function getAvailableHostMoodFilters(hostMoodMap: Map<string, string[]>) {
  const availableMoods = new Set<string>();

  for (const moods of hostMoodMap.values()) {
    for (const mood of moods) {
      availableMoods.add(mood);
    }
  }

  return ["all", ...Array.from(availableMoods).sort(compareMoods)];
}

export function hostMatchesMood(
  hostId: string,
  selectedMood: string,
  hostMoodMap: Map<string, string[]>,
) {
  const normalizedMood = normalizeMood(selectedMood);

  if (normalizedMood === "all") {
    return true;
  }

  return hostMoodMap.get(hostId)?.includes(normalizedMood) ?? false;
}

export function getHostMoodTags(
  hostId: string,
  hostMoodMap: Map<string, string[]>,
  limit?: number,
) {
  const moods = hostMoodMap.get(hostId) ?? [];
  return typeof limit === "number" ? moods.slice(0, limit) : moods;
}
