/**
 * Event Recommendation Utility
 * Uses Gemini AI to recommend similar mood events based on a booked event
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

import type { EventDTO } from "~/lib/api";

export interface RecommendationResult {
  recommendedEvent: EventDTO | null;
  score: number; // 0-100, similarity score
  reason: string; // Why this event is recommended
}

/**
 * Simple local recommendation based on mood matching
 */
function recommendByMoodLocal(
  bookedEvent: EventDTO,
  availableEvents: EventDTO[],
): RecommendationResult {
  // Filter events that are:
  // 1. Not the booked event
  // 2. Have the same or similar mood
  // 3. Have available spots
  // 4. And haven't passed yet

  const now = new Date();
  const similarEvents = availableEvents.filter((event) => {
    if (event.id === bookedEvent.id) return false;
    if (!event.mood) return false;
    if (event.total_bookings >= event.capacity) return false;

    const eventDate = new Date(event.time);
    if (eventDate < now) return false;

    // Match mood exactly or partial match
    return (
      event.mood.toLowerCase() === bookedEvent.mood?.toLowerCase() ||
      event.mood
        .toLowerCase()
        .includes((bookedEvent.mood ?? "").toLowerCase()) ||
      (bookedEvent.mood ?? "").toLowerCase().includes(event.mood.toLowerCase())
    );
  });

  if (similarEvents.length === 0) {
    return {
      recommendedEvent: null,
      score: 0,
      reason: "No similar experiences available",
    };
  }

  // Sort by closest date and pick the first one
  similarEvents.sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
  );

  const recommended = similarEvents[0];
  if (!recommended) {
    return {
      recommendedEvent: null,
      score: 0,
      reason: "No similar experiences available",
    };
  }

  return {
    recommendedEvent: recommended,
    score: 85,
    reason: `We think you'll love this ${recommended.mood} experience too!`,
  };
}

/**
 * AI-based recommendation using Gemini
 */
async function recommendByMoodAI(
  bookedEvent: EventDTO,
  availableEvents: EventDTO[],
): Promise<RecommendationResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return recommendByMoodLocal(bookedEvent, availableEvents);
  }

  // Filter to viable events (same filtering as local)
  const now = new Date();
  const viableEvents = availableEvents.filter((event) => {
    if (event.id === bookedEvent.id) return false;
    if (!event.mood) return false;
    if (event.total_bookings >= event.capacity) return false;
    if (new Date(event.time) < now) return false;
    return true;
  });

  if (viableEvents.length === 0) {
    return {
      recommendedEvent: null,
      score: 0,
      reason: "No similar experiences available",
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const eventsJson = JSON.stringify(
      viableEvents.map((e) => ({
        id: e.id,
        title: e.title,
        mood: e.mood,
        description: e.description?.substring(0, 100),
        time: e.time,
      })),
    );

    const prompt = `Given that a user just booked an "${bookedEvent.mood}" experience titled "${bookedEvent.title}", 
which of these ${viableEvents.length} other experiences would you recommend they look at next?

Available experiences:
${eventsJson}

Respond with ONLY a JSON object in this format:
{
  "recommendedEventId": "the event id",
  "similarityScore": number (0-100),
  "reason": "brief reason why"
}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const jsonMatch = /\{[\s\S]*\}/.exec(responseText);
    if (!jsonMatch?.[0]) {
      return recommendByMoodLocal(bookedEvent, availableEvents);
    }

    const aiResult = JSON.parse(jsonMatch[0]) as {
      recommendedEventId: string;
      similarityScore: number;
      reason: string;
    };
    const recommended = viableEvents.find(
      (e) => e.id === aiResult.recommendedEventId,
    );

    if (!recommended) {
      return recommendByMoodLocal(bookedEvent, availableEvents);
    }

    const score: number =
      typeof aiResult.similarityScore === "number"
        ? aiResult.similarityScore
        : 80;
    const reason: string =
      typeof aiResult.reason === "string"
        ? aiResult.reason
        : "Based on your preferences";

    return {
      recommendedEvent: recommended,
      score,
      reason,
    };
  } catch (error) {
    console.error("AI recommendation failed, falling back to local:", error);
    return recommendByMoodLocal(bookedEvent, availableEvents);
  }
}

/**
 * Main recommendation function
 */
export async function getRecommendedEvent(
  bookedEvent: EventDTO,
  availableEvents: EventDTO[],
): Promise<RecommendationResult> {
  // Try AI first, fallback to local
  return await recommendByMoodAI(bookedEvent, availableEvents);
}

/**
 * Sync version using only local recommendation
 */
export function getRecommendedEventSync(
  bookedEvent: EventDTO,
  availableEvents: EventDTO[],
): RecommendationResult {
  return recommendByMoodLocal(bookedEvent, availableEvents);
}
