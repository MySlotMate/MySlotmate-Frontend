"use client";

import { useEffect, useState } from "react";

/**
 * Render saved rich-text HTML safely.
 *
 * Use this anywhere user-authored description HTML needs to be displayed.
 * Sanitizes via DOMPurify so no script/iframe/event-handler injections survive.
 */
export function RichTextView({
  html,
  className = "",
}: {
  html: string;
  className?: string;
}) {
  const [clean, setClean] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    // Lazy-load DOMPurify so server bundles stay slim.
    void (async () => {
      const mod = (await import("isomorphic-dompurify")).default;
      const sanitized = mod.sanitize(html ?? "", {
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
      });
      if (!cancelled) setClean(sanitized);
    })();
    return () => {
      cancelled = true;
    };
  }, [html]);

  return (
    <div
      className={`rich-text-content ${className}`}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
