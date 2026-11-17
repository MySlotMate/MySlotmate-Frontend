import { FiX, FiZap } from "react-icons/fi";
import type { Suggestion } from "~/hooks/useSuggestions";

interface SuggestionChipsProps {
  suggestions: Suggestion[];
  isLoading: boolean;
  onSelect: (suggestion: string) => void;
  onDismiss?: () => void;
}

export function SuggestionChips({
  suggestions,
  isLoading,
  onSelect,
  onDismiss,
}: SuggestionChipsProps) {
  if (suggestions.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isLoading && (
        <div className="flex animate-pulse items-center gap-2 rounded-full border border-[#652A91]/60 bg-[#241333] px-3 py-1.5 text-xs text-[#D8B4FE]">
          <div className="h-3 w-3 animate-spin rounded-full bg-[#A020F0]" />
          Getting suggestions...
        </div>
      )}
      {suggestions.map((suggestion) => (
        <button
          key={suggestion.id}
          type="button"
          onClick={() => onSelect(suggestion.text)}
          className="group inline-flex items-center gap-1.5 rounded-full border border-[#A020F0] bg-linear-to-r from-[#A020F0]/10 to-[#A020F0]/5 px-3 py-1.5 text-xs font-medium text-[#D8B4FE] transition hover:border-[#A020F0] hover:bg-linear-to-r hover:from-[#A020F0]/20 hover:to-[#A020F0]/10"
        >
          <FiZap size={12} className="shrink-0" />
          <span className="max-w-xs truncate">{suggestion.text}</span>
          {suggestion.confidence && (
            <span className="text-[10px] opacity-50">
              {Math.round(suggestion.confidence * 100)}%
            </span>
          )}
        </button>
      ))}
      {(suggestions.length > 0 || isLoading) && onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-full p-1 text-[#777B98] transition hover:bg-white/[0.06] hover:text-[#A5A8C3]"
          title="Dismiss suggestions"
        >
          <FiX size={14} />
        </button>
      )}
    </div>
  );
}
