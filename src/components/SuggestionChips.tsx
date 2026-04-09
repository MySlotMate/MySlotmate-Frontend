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
    <div className="flex flex-wrap gap-2 items-center">
      {isLoading && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-xs text-blue-600 animate-pulse">
          <div className="w-3 h-3 rounded-full bg-blue-400 animate-spin" />
          Getting suggestions...
        </div>
      )}
      {suggestions.map((suggestion) => (
        <button
          key={suggestion.id}
          type="button"
          onClick={() => onSelect(suggestion.text)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-linear-to-r from-[#0094CA]/10 to-[#0094CA]/5 border border-[#0094CA]/30 text-xs font-medium text-[#0094CA] hover:border-[#0094CA]/60 hover:bg-linear-to-r hover:from-[#0094CA]/20 hover:to-[#0094CA]/10 transition group"
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
          className="p-1 hover:bg-gray-100 rounded-full transition text-gray-400 hover:text-gray-600"
          title="Dismiss suggestions"
        >
          <FiX size={14} />
        </button>
      )}
    </div>
  );
}
