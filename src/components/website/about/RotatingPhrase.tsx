"use client";

import { useEffect, useState } from "react";

/**
 * One phrase at a time, sliding up into place. Every phrase is rendered (the
 * longest sets the width), so the line never jumps. Screen readers get the
 * full list once instead of a changing line.
 */
export default function RotatingPhrase({
  phrases,
  interval = 2600,
  className = "",
}: {
  phrases: string[];
  interval?: number;
  className?: string;
}) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      if (!document.hidden) setI((n) => (n + 1) % phrases.length);
    }, interval);
    return () => window.clearInterval(id);
  }, [phrases.length, interval]);

  return (
    <span className="relative inline-grid">
      <span className="sr-only">{phrases.join(", ")}</span>
      {phrases.map((p, k) => (
        <span
          key={p}
          aria-hidden
          // The style class goes on each phrase: a gradient clipped to text
          // on the parent would paint every phrase, ignoring their opacity.
          className={`col-start-1 row-start-1 transition-[opacity,transform] duration-700 ease-[cubic-bezier(.2,.7,.2,1)] ${className}`}
          style={{
            opacity: k === i ? 1 : 0,
            transform:
              k === i
                ? "translateY(0)"
                : `translateY(${k === (i + phrases.length - 1) % phrases.length ? "-60%" : "60%"})`,
          }}
        >
          {p}
        </span>
      ))}
    </span>
  );
}
