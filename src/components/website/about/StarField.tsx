"use client";

import { useEffect, useRef } from "react";

type Star = {
  x: number;
  y: number;
  r: number;
  layer: number;
  phase: number;
  speed: number;
  tint: string;
};

type Shooting = { x: number; y: number; t0: number };

// Deeper layers move less with scroll: that difference is the depth.
const PARALLAX = [0.05, 0.12, 0.22];
const TINTS = ["248,247,255", "216,180,254", "248,247,255"];

/**
 * A fixed night sky behind the whole About page. Stars twinkle, drift with the
 * scroll at three depths, and a shooting star crosses every few seconds. It is
 * the one element that stays with you through every chapter.
 */
export default function StarField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let w = 0;
    let h = 0;
    let stars: Star[] = [];
    let shooting: Shooting | null = null;
    let nextShot = performance.now() + 2500;
    let raf = 0;

    const build = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(220, Math.round((w * h) / 6500));
      stars = Array.from({ length: count }, () => {
        const layer = Math.random() < 0.55 ? 0 : Math.random() < 0.7 ? 1 : 2;
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          r: [0.55, 0.9, 1.3][layer]! * (0.7 + Math.random() * 0.6),
          layer,
          phase: Math.random() * Math.PI * 2,
          speed: 0.6 + Math.random() * 1.6,
          tint: TINTS[Math.floor(Math.random() * TINTS.length)]!,
        };
      });
    };

    const draw = (now: number) => {
      ctx.clearRect(0, 0, w, h);
      const scroll = reduce ? 0 : window.scrollY;
      for (const s of stars) {
        const y = (((s.y - scroll * PARALLAX[s.layer]!) % h) + h) % h;
        const tw = reduce
          ? 0.8
          : 0.55 + 0.45 * Math.sin((now / 1000) * s.speed + s.phase);
        // Dim the stars in the middle of the screen, where the text sits;
        // full brightness only towards the edges.
        const edge = Math.abs(s.x / w - 0.5) * 2;
        const side = 0.3 + 0.7 * Math.min(1, Math.max(0, (edge - 0.45) / 0.4));
        ctx.globalAlpha = tw * (0.3 + s.layer * 0.18) * side;
        ctx.fillStyle = `rgb(${s.tint})`;
        ctx.beginPath();
        ctx.arc(s.x, y, s.r, 0, Math.PI * 2);
        ctx.fill();
        if (s.layer === 2) {
          ctx.globalAlpha = tw * 0.08 * side;
          ctx.beginPath();
          ctx.arc(s.x, y, s.r * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (!reduce) {
        if (!shooting && now > nextShot) {
          shooting = {
            x: w * (0.35 + Math.random() * 0.6),
            y: h * Math.random() * 0.35,
            t0: now,
          };
        }
        if (shooting) {
          const p = (now - shooting.t0) / 900;
          if (p >= 1) {
            shooting = null;
            nextShot = now + 4000 + Math.random() * 5000;
          } else {
            const dist = 520 * p;
            const hx = shooting.x - dist * 0.9;
            const hy = shooting.y + dist * 0.42;
            const grad = ctx.createLinearGradient(
              hx,
              hy,
              hx + 150 * 0.9,
              hy - 150 * 0.42,
            );
            grad.addColorStop(0, "rgba(255,255,255,0.95)");
            grad.addColorStop(1, "rgba(216,180,254,0)");
            ctx.globalAlpha = Math.sin(p * Math.PI);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(hx, hy);
            ctx.lineTo(hx + 150 * 0.9, hy - 150 * 0.42);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
    };

    const loop = (now: number) => {
      if (!document.hidden) draw(now);
      raf = requestAnimationFrame(loop);
    };

    build();
    if (reduce) {
      draw(0);
    } else {
      raf = requestAnimationFrame(loop);
    }
    const onResize = () => {
      build();
      if (reduce) draw(0);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 h-screen w-screen"
    />
  );
}
