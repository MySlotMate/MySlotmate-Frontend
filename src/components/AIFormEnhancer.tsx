"use client";

import { useEffect } from "react";
import { toast } from "sonner";

const DATALIST_ID = "ai-autocomplete-words";
const SUGGESTION_BOX_ID = "ai-nlp-suggestion-box";
const TOXICITY_BLOCK_THRESHOLD = 5;

const AUTOCOMPLETE_WORDS = [
  "adventure",
  "authentic",
  "community",
  "creative",
  "culture",
  "discover",
  "experience",
  "friendly",
  "host",
  "immersive",
  "local",
  "memorable",
  "safety",
  "supportive",
  "workshop",
];

const NLP_CORPUS = [
  "discover local experiences with friendly hosts",
  "book authentic adventure with your community",
  "create memorable moments with immersive activities",
  "find creative workshops and culture events",
  "host a supportive and safe experience",
  "learn new skills and meet local people",
  "plan your next experience with confidence",
  "join a friendly community of explorers",
];

const ABUSIVE_PATTERNS: Array<{ pattern: RegExp; score: number }> = [
  { pattern: /\b(fuck|fucking|motherfucker)\b/i, score: 9 },
  { pattern: /\b(shit|bullshit|asshole|bitch)\b/i, score: 8 },
  { pattern: /\b(bastard|dumbass|moron|idiot|stupid)\b/i, score: 7 },
  { pattern: /\b(hate you|kill you|go die)\b/i, score: 10 },
  { pattern: /\b(suck|trash|loser)\b/i, score: 6 },
];

type BigramModel = Map<string, Map<string, number>>;

function isTextLikeField(
  element: Element | null,
): element is HTMLInputElement | HTMLTextAreaElement {
  if (!element) return false;
  if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
    return false;
  }

  if (element instanceof HTMLTextAreaElement) return true;

  const inputType = element.type?.toLowerCase() ?? "text";
  return ["text", "search", "email", "url", "tel"].includes(inputType);
}

function getSuggestionWordList(): string[] {
  const fromWindow =
    typeof window !== "undefined" ? window.localStorage.getItem("aiAutocompleteWords") : null;

  if (!fromWindow) return AUTOCOMPLETE_WORDS;

  const customWords = fromWindow
    .split(",")
    .map((word) => word.trim().toLowerCase())
    .filter(Boolean);

  return customWords.length > 0 ? customWords : AUTOCOMPLETE_WORDS;
}

function ensureDatalist(words: string[]) {
  if (typeof document === "undefined") return;

  let datalist = document.getElementById(DATALIST_ID) as HTMLDataListElement | null;
  if (!datalist) {
    datalist = document.createElement("datalist");
    datalist.id = DATALIST_ID;
    document.body.appendChild(datalist);
  }

  datalist.innerHTML = "";
  words.forEach((word) => {
    const option = document.createElement("option");
    option.value = word;
    datalist?.appendChild(option);
  });
}

function attachAutocompleteList() {
  if (typeof document === "undefined") return;

  const fields = document.querySelectorAll("input, textarea");
  fields.forEach((field) => {
    if (!isTextLikeField(field) || field.readOnly || field.disabled) return;
    if (field instanceof HTMLInputElement) {
      field.setAttribute("list", DATALIST_ID);
      field.classList.add("ai-autocomplete-field");
    }
  });
}

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z']+/g) ?? []).filter(Boolean);
}

function buildBigramModel(words: string[]): BigramModel {
  const model: BigramModel = new Map();
  const corpusTokens = [...words, ...NLP_CORPUS].flatMap(tokenize);

  for (let i = 0; i < corpusTokens.length - 1; i += 1) {
    const prev = corpusTokens[i];
    const next = corpusTokens[i + 1];
    if (!prev || !next) continue;
    const nextMap = model.get(prev) ?? new Map<string, number>();
    nextMap.set(next, (nextMap.get(next) ?? 0) + 1);
    model.set(prev, nextMap);
  }
  return model;
}

function ensureSuggestionBox() {
  if (typeof document === "undefined") return null;
  let box = document.getElementById(SUGGESTION_BOX_ID) as HTMLDivElement | null;
  if (!box) {
    box = document.createElement("div");
    box.id = SUGGESTION_BOX_ID;
    box.style.position = "fixed";
    box.style.zIndex = "10000";
    box.style.background = "#ffffff";
    box.style.border = "1px solid #e5e7eb";
    box.style.borderRadius = "10px";
    box.style.padding = "6px 8px";
    box.style.boxShadow = "0 10px 20px rgba(0,0,0,0.08)";
    box.style.fontSize = "12px";
    box.style.color = "#6b7280";
    box.style.display = "none";
    box.style.pointerEvents = "none";
    document.body.appendChild(box);
  }
  return box;
}

function hideSuggestionBox() {
  if (typeof document === "undefined") return;
  const box = document.getElementById(SUGGESTION_BOX_ID) as HTMLDivElement | null;
  if (!box) return;
  box.style.display = "none";
}

function updateDatalistWithSuggestions(suggestions: string[]) {
  const datalist = document.getElementById(DATALIST_ID) as HTMLDataListElement | null;
  if (!datalist) return;
  datalist.innerHTML = "";
  suggestions.forEach((word) => {
    const option = document.createElement("option");
    option.value = word;
    datalist.appendChild(option);
  });
}

function showSuggestionBox(
  field: HTMLInputElement | HTMLTextAreaElement,
  suggestions: string[],
  prefix: string,
) {
  const box = ensureSuggestionBox();
  if (!box || suggestions.length === 0) {
    hideSuggestionBox();
    return;
  }

  const rect = field.getBoundingClientRect();
  box.style.left = `${Math.min(rect.left, window.innerWidth - 240)}px`;
  box.style.top = `${Math.min(rect.bottom + 6, window.innerHeight - 80)}px`;
  box.style.maxWidth = `${Math.max(180, rect.width)}px`;
  box.innerText = suggestions
    .slice(0, 3)
    .map((word, i) => `${i === 0 ? "Tab" : "or"}: ${prefix ? `${prefix}${word.slice(prefix.length)}` : word}`)
    .join("    ");
  box.style.display = "block";
}

function getContext(value: string, caretPosition: number): { previousWord: string | null; prefix: string } {
  const beforeCaret = value.slice(0, caretPosition);
  const prefixMatch = /([a-z']+)$/i.exec(beforeCaret);
  const prefix = (prefixMatch?.[1] ?? "").toLowerCase();
  const withoutPrefix = prefix ? beforeCaret.slice(0, -prefix.length) : beforeCaret;
  const previousTokens = tokenize(withoutPrefix);
  const previousWord = previousTokens.length > 0 ? previousTokens[previousTokens.length - 1]! : null;
  return { previousWord, prefix };
}

function getNlpSuggestions(
  value: string,
  caretPosition: number,
  words: string[],
  model: BigramModel,
): string[] {
  const { previousWord, prefix } = getContext(value, caretPosition);
  const scores = new Map<string, number>();

  words.forEach((word) => {
    if (prefix && !word.startsWith(prefix)) return;
    if (prefix && word === prefix) return;
    scores.set(word, 1);
  });

  if (previousWord) {
    const nextMap = model.get(previousWord);
    if (nextMap) {
      nextMap.forEach((count, candidate) => {
        if (prefix && !candidate.startsWith(prefix)) return;
        if (prefix && candidate === prefix) return;
        scores.set(candidate, (scores.get(candidate) ?? 0) + count * 5);
      });
    }
  }

  return Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);
}

function resolveTabCompletion(
  value: string,
  caretPosition: number,
  words: string[],
): { nextValue: string; nextCaretPosition: number } | null {
  const tryWordCompletion = (word: string) => {
    const beforeCaret = value.slice(0, caretPosition);
    const afterCaret = value.slice(caretPosition);
    const prefixMatch = /(^|[\s(])([a-z]+)$/i.exec(beforeCaret);
    const partial = prefixMatch?.[2];

    if (!partial || partial.length < 1) return null;
    const normalizedPartial = partial.toLowerCase();
    const normalizedWord = word.toLowerCase();
    if (!normalizedWord.startsWith(normalizedPartial) || normalizedWord === normalizedPartial) return null;

    const replaceStart = beforeCaret.length - partial.length;
    const nextBefore = `${beforeCaret.slice(0, replaceStart)}${word}`;
    return {
      nextValue: `${nextBefore}${afterCaret}`,
      nextCaretPosition: nextBefore.length,
    };
  };

  for (const word of words) {
    const completion = tryWordCompletion(word);
    if (completion) return completion;
  }

  return null;
}

function resolveCompletionUsingWord(
  value: string,
  caretPosition: number,
  suggestionWord: string,
): { nextValue: string; nextCaretPosition: number } | null {
  const beforeCaret = value.slice(0, caretPosition);
  const afterCaret = value.slice(caretPosition);
  const prefixMatch = /(^|[\s(])([a-z]+)$/i.exec(beforeCaret);
  const partial = prefixMatch?.[2];

  if (!partial || partial.length < 1) return null;

  const normalizedPartial = partial.toLowerCase();
  const match = suggestionWord.toLowerCase();

  if (!match.startsWith(normalizedPartial) || match === normalizedPartial) return null;

  const replaceStart = beforeCaret.length - partial.length;
  const nextBefore = `${beforeCaret.slice(0, replaceStart)}${suggestionWord}`;
  return {
    nextValue: `${nextBefore}${afterCaret}`,
    nextCaretPosition: nextBefore.length,
  };
}

function scoreTextToxicity(text: string): number {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return 1;

  let score = 1;

  ABUSIVE_PATTERNS.forEach(({ pattern, score: patternScore }) => {
    if (pattern.test(normalized)) {
      score = Math.max(score, patternScore);
    }
  });

  if (/[A-Z]{5,}/.test(text) || /!{3,}/.test(text)) {
    score = Math.max(score, 6);
  }

  return Math.min(10, score);
}

function getWorstToxicityAcrossText(text: string): number {
  const sentences = text
    .split(/[.!?]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const words = text.match(/\b[\w'-]+\b/g) ?? [];
  const units = [...sentences, ...words];
  if (units.length === 0) return 1;

  return units.reduce((worst, unit) => Math.max(worst, scoreTextToxicity(unit)), 1);
}

export default function AIFormEnhancer() {
  useEffect(() => {
    const words = getSuggestionWordList();
    const model = buildBigramModel(words);
    ensureDatalist(words);
    attachAutocompleteList();

    const observer = new MutationObserver(() => {
      attachAutocompleteList();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const updateSuggestionsForField = (field: HTMLInputElement | HTMLTextAreaElement) => {
      const caretPosition = field.selectionStart ?? field.value.length;
      const suggestions = getNlpSuggestions(field.value, caretPosition, words, model);
      if (suggestions.length === 0) {
        field.dataset.aiSuggestion = "";
        hideSuggestionBox();
        updateDatalistWithSuggestions(words);
        return;
      }

      field.dataset.aiSuggestion = suggestions[0] ?? "";
      updateDatalistWithSuggestions(suggestions);
      const { prefix } = getContext(field.value, caretPosition);
      showSuggestionBox(field, suggestions, prefix);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      if (!isTextLikeField(document.activeElement)) return;

      const field = document.activeElement;
      if (field.readOnly || field.disabled) return;

      const selectionStart = field.selectionStart ?? field.value.length;
      const selectionEnd = field.selectionEnd ?? selectionStart;
      if (selectionStart !== selectionEnd) return;

      const completion = resolveTabCompletion(field.value, selectionStart, words);
      const fallbackSuggestion = field.dataset.aiSuggestion ?? "";
      const resolvedCompletion =
        completion ??
        (fallbackSuggestion
          ? resolveCompletionUsingWord(field.value, selectionStart, fallbackSuggestion)
          : null);

      if (!resolvedCompletion) return;

      event.preventDefault();
      field.value = resolvedCompletion.nextValue;
      field.setSelectionRange(resolvedCompletion.nextCaretPosition, resolvedCompletion.nextCaretPosition);
      field.dispatchEvent(new Event("input", { bubbles: true }));
    };

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as Element | null;
      if (!isTextLikeField(target)) return;
      if (target.readOnly || target.disabled) return;
      updateSuggestionsForField(target);
    };

    const handleFocusOut = (event: FocusEvent) => {
      const target = event.target as Element | null;
      if (!isTextLikeField(target)) return;
      if (document.activeElement !== target) hideSuggestionBox();
    };

    const handleInput = (event: Event) => {
      const target = event.target as Element | null;
      if (!isTextLikeField(target)) return;
      if (target.readOnly || target.disabled) return;
      updateSuggestionsForField(target);
    };

    const handleSubmit = (event: Event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;

      const fields = Array.from(form.querySelectorAll("input, textarea"));
      let highestScore = 1;

      fields.forEach((field) => {
        if (!isTextLikeField(field) || field.disabled) return;
        highestScore = Math.max(highestScore, getWorstToxicityAcrossText(field.value ?? ""));
      });

      if (highestScore > TOXICITY_BLOCK_THRESHOLD) {
        event.preventDefault();
        event.stopPropagation();
        toast.warning(
          `Submission blocked. Detected potentially abusive text (toxicity: ${highestScore}/10). Please edit and try again.`,
        );
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("focusin", handleFocusIn, true);
    document.addEventListener("focusout", handleFocusOut, true);
    document.addEventListener("input", handleInput, true);
    document.addEventListener("submit", handleSubmit, true);

    return () => {
      observer.disconnect();
      hideSuggestionBox();
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("focusin", handleFocusIn, true);
      document.removeEventListener("focusout", handleFocusOut, true);
      document.removeEventListener("input", handleInput, true);
      document.removeEventListener("submit", handleSubmit, true);
    };
  }, []);

  return null;
}
