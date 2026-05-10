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
        <div className="flex animate-pulse items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs text-blue-600">
          <div className="h-3 w-3 animate-spin rounded-full bg-blue-400" />
          Getting suggestions...
        </div>
      )}
      {suggestions.map((suggestion) => (
        <button
          key={suggestion.id}
          type="button"
          onClick={() => onSelect(suggestion.text)}
          className="group inline-flex items-center gap-1.5 rounded-full border border-[#0094CA]/30 bg-linear-to-r from-[#0094CA]/10 to-[#0094CA]/5 px-3 py-1.5 text-xs font-medium text-[#0094CA] transition hover:border-[#0094CA]/60 hover:bg-linear-to-r hover:from-[#0094CA]/20 hover:to-[#0094CA]/10"
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
          className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          title="Dismiss suggestions"
        >
          <FiX size={14} />
        </button>
      )}
    </div>
  );
}
