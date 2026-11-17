"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Fades its children in when they scroll into view, and sets `data-in` so
 * CSS can run richer effects (constellation lines drawing, labels appearing).
 *
 * The server renders everything visible. Only after mounting, and only for
 * content still below the fold, does it hide and then reveal — so the page
 * never depends on JavaScript to be readable.
 */
export default function Reveal({
  children,
  className = "",
  as: Tag = "div",
  threshold = 0.25,
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "figure";
  threshold?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<"static" | "waiting" | "in">("static");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setState("in");
      return;
    }
    const below = el.getBoundingClientRect().top > window.innerHeight * 0.9;
    setState(below ? "waiting" : "in");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setState("in");
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement>}
      data-reveal={state}
      data-in={state === "in" || undefined}
      className={className}
    >
      {children}
    </Tag>
  );
}
