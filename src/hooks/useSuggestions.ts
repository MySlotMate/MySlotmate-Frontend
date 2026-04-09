"use client";

import { useState, useCallback, useRef, useEffect } from "react";

/* eslint-disable */
// @ts-ignore - GoogleGenerativeAI types not fully resolved
import { GoogleGenerativeAI } from "@google/generative-ai";
/* eslint-enable */

export interface Suggestion {
  id: string;
  text: string;
  confidence?: number;
}

export interface UseSuggestionsReturn {
  suggestions: Suggestion[];
  isLoading: boolean;
  error: string | null;
  generateSuggestions: (
    text: string,
    fieldType: "title" | "hookLine" | "description",
    context?: Record<string, string>
  ) => Promise<void>;
  clearSuggestions: () => void;
}

/**
 * Hook for generating AI suggestions using Gemini API
 * Provides autocomplete-style suggestions for experience creation fields
 */
export function useSuggestions(): UseSuggestionsReturn {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | undefined>(undefined);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setError(null);
  }, []);

  const generateSuggestions = useCallback(
    async (
      text: string,
      fieldType: "title" | "hookLine" | "description",
      context?: Record<string, string>
    ) => {
      // Clear previous error
      setError(null);

      // Don't generate suggestions for very short input
      if (text.trim().length < 3) {
        clearSuggestions();
        return;
      }

      // Clear previous debounce timer
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      // Debounce the API call (500ms)
      debounceTimer.current = setTimeout(() => {
        void (async () => {
          setIsLoading(true);

          try {
            const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
            if (!apiKey) {
              setIsLoading(false);
              return; // Silently fail if API key not available
            }

            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

          let prompt = "";

          if (fieldType === "title") {
            prompt = `You are helping someone create an experience listing. The user started typing an experience title:
"${text}"

Generate 3 short, catchy, and engaging experience titles that:
1. Start with or expand on what the user wrote
2. Are specific and appealing to potential guests
3. Are 5-15 words long

Return ONLY a JSON array of objects like: [
  { "text": "Morning Yoga by the Beach", "confidence": 0.95 },
  { "text": "Sunrise Beach Yoga & Meditation", "confidence": 0.90 },
  { "text": "Beachside Yoga for Beginners", "confidence": 0.85 }
]

No markdown, no explanation, just JSON.`;
          } else if (fieldType === "hookLine") {
            prompt = `You are helping someone create an experience listing. The experience title is: "${context?.title ?? "Untitled"}"

The user started typing a hook line (a catchy phrase to attract guests):
"${text}"

Generate 3 compelling hook lines that:
1. Expand on what the user wrote
2. Are attention-grabbing and specific
3. Are 5-20 words long
4. Focus on the experience benefits or unique element

Return ONLY a JSON array like: [
  { "text": "Unwind with yoga and ocean sounds", "confidence": 0.95 },
  { "text": "Find inner peace on the sandy shore", "confidence": 0.90 }
]

No markdown, no explanation, just JSON.`;
          } else if (fieldType === "description") {
            prompt = `You are helping someone create an experience listing. The experience is: "${context?.title ?? "Untitled"}"
Hook line: "${context?.hookLine ?? ""}"
Mood: "${context?.mood ?? ""}"

The user started typing a description:
"${text}"

Generate 3 compelling continuation options that:
1. Expand naturally on what they wrote
2. Describe what guests will experience, what they'll learn, and what makes it special
3. Are 20-50 words each
4. Avoid any malicious content like contact sharing, payment outside platform, or unsafe meetups

Return ONLY a JSON array like: [
  { "text": "Learn proper yoga techniques while listening to ocean waves. Perfect for beginners and experienced yogis alike.", "confidence": 0.95 }
]

No markdown, no explanation, just JSON.`;
          }

          const result = await model.generateContent(prompt);
          const responseText = result.response.text();

          // Extract JSON from response
          const jsonMatch = /\[\[\s\S]*\]/.exec(responseText);
          if (!jsonMatch?.[0]) {
            setIsLoading(false);
            return;
          }

          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const parsed = JSON.parse(jsonMatch[0]);

          // Transform to include IDs
          const transformedSuggestions: Suggestion[] = (parsed as Array<{ text: string; confidence?: number }>).map(
            (item, idx) => ({
              id: `${fieldType}-${Date.now()}-${idx}`,
              text: item.text,
              confidence: item.confidence,
            })
          );

          setSuggestions(transformedSuggestions);
          } catch (err) {
            console.error("Suggestion generation error:", err);
            // Silently fail - don't show error to user as this is an enhancement feature
          } finally {
            setIsLoading(false);
          }
        })();
      }, 500);
    },
    [clearSuggestions]
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return {
    suggestions,
    isLoading,
    error,
    generateSuggestions,
    clearSuggestions,
  };
}
