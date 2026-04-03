/**
 * Content Moderation Hook
 * Provides a simple interface for checking content in React components
 */
"use client";

import { useState, useCallback } from "react";
import { analyzeContent, analyzeContentSync, type ModerationResult } from "~/lib/moderation";

interface UseContentModerationReturn {
  checkContent: (text: string) => Promise<ModerationResult>;
  checkContentSync: (text: string) => ModerationResult;
  isAnalyzing: boolean;
  lastResult: ModerationResult | null;
}

export function useContentModeration(): UseContentModerationReturn {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastResult, setLastResult] = useState<ModerationResult | null>(null);

  const checkContent = useCallback(async (text: string) => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeContent(text);
      setLastResult(result);
      return result;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const checkContentSync = useCallback((text: string) => {
    const result = analyzeContentSync(text);
    setLastResult(result);
    return result;
  }, []);

  return {
    checkContent,
    checkContentSync,
    isAnalyzing,
    lastResult,
  };
}
