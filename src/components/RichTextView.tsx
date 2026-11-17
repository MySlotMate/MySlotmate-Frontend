"use client";

import { useMemo } from "react";
import DOMPurify from "isomorphic-dompurify";

const CONFIG = {
  ALLOWED_TAGS: [
    "p",
    "br",
    "strong",
    "em",
    "u",
    "h1",
    "h2",
    "h3",
    "ul",
    "ol",
    "li",
    "a",
    "span",
    "img",
    "figure",
    "figcaption",
  ],
  ALLOWED_ATTR: [
    "href",
    "target",
    "rel",
    "style",
    "class",
    "src",
    "alt",
    "title",
    "width",
    "height",
    "loading",
  ],
};

/**
 * Render saved rich-text HTML safely.
 *
 * Use this anywhere user-authored description HTML needs to be displayed.
 * Sanitizes via DOMPurify so no script/iframe/event-handler injections survive.
 *
 * Sanitizing happens during render (isomorphic-dompurify works on the server
 * and in the browser), so the text is in the server HTML: search engines and
 * first paint see the content, not an empty box.
 */
export function RichTextView({
  html,
  className = "",
}: {
  html: string;
  className?: string;
}) {
  const clean = useMemo(() => DOMPurify.sanitize(html ?? "", CONFIG), [html]);

  return (
    <div
      className={`rich-text-content ${className}`}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
