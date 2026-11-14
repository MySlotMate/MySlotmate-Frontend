"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowRight } from "lucide-react";
import { BecomeHostModal } from "~/components/become-host";
import { useListTimeAction } from "~/hooks/useListTimeAction";
import CitySky from "./CitySky";
import { GRADIENT } from "./shared";

/** Every photo from the community section: real MySlotMate events. */
const MOMENTS = [
  ["/Event Photos/plate-to-fame/IMG-20260621-WA0023.webp", "Plate to Fame"],
  ["/Event Photos/Chrochet event/IMG_1134.webp", "Crochet Event"],
  ["/Event Photos/plate-to-fame/IMG-20260621-WA0051.webp", "Plate to Fame"],
  ["/Event Photos/Chrochet event/IMG_1141.webp", "Crochet Event"],
  ["/Event Photos/plate-to-fame/IMG-20260621-WA0069.webp", "Plate to Fame"],
  ["/Event Photos/Chrochet event/IMG_1142.webp", "Crochet Event"],
  [
    "/Event Photos/plate-to-fame/WhatsApp Image 2026-06-22 at 9.02.51 AM.webp",
    "Plate to Fame",
  ],
  ["/Event Photos/Chrochet event/IMG_1155.webp", "Crochet Event"],
] as const;

/**
 * Where each photo sits relative to the front one. Offsets are fractions of
 * the photo's own width, so the fan scales with the screen.
 */
const SLOTS: Record<
  number,
  { x: number; y: number; r: number; s: number; o: number; z: number }
> = {
  [-2]: { x: -2.3, y: 0.2, r: -12, s: 0.8, o: 0, z: 0 },
  [-1]: { x: -1.42, y: 0.12, r: -7, s: 0.9, o: 1, z: 1 },
  0: { x: -0.5, y: 0, r: 2, s: 1.08, o: 1, z: 3 },
  1: { x: 0.42, y: 0.1, r: 8, s: 0.9, o: 1, z: 1 },
  2: { x: 1.3, y: 0.2, r: 12, s: 0.8, o: 0, z: 0 },
};

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const on = () => setReduce(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduce;
}

/**
 * Logged-out home hero, Offlyn-style: one line, one action, one calm scene.
 * The logo's sparkles drift in the sky; real community photos rotate on the
 * horizon, because the promise is meeting people in real life.
 */
export default function Hero() {
  const { closeBecomeHostModal, handleListTimeClick, showBecomeHostModal } =
    useListTimeAction();
  const reduce = usePrefersReducedMotion();
  const [front, setFront] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = MOMENTS.length;

  useEffect(() => {
    if (reduce || paused) return;
    const id = window.setInterval(() => {
      if (!document.hidden) setFront((f) => (f + 1) % n);
    }, 3200);
    return () => window.clearInterval(id);
  }, [reduce, paused, n]);

  // Signed distance from the front photo, wrapped to -n/2..n/2.
  const slotOf = (i: number) => {
    let d = (i - front + n) % n;
    if (d > n / 2) d -= n;
    return Math.max(-2, Math.min(2, d));
  };

  return (
    <section
      aria-label="Welcome to MySlotMate"
      className="relative isolate flex min-h-[calc(100svh-80px)] w-full flex-col gap-10 overflow-hidden"
    >
      <CitySky />

      <div className="mx-auto flex w-full max-w-[1280px] flex-col items-center px-5 pt-8 text-center md:px-10 md:pt-12">
        <h1 className="font-outfit msm-rise max-w-[11ch] text-[clamp(46px,6.4vw,92px)] leading-[1] font-extrabold tracking-[-0.035em] text-balance text-white md:max-w-[17ch]">
          Life happens when you{" "}
          <span
            className={`${GRADIENT} bg-clip-text pr-[0.04em] text-transparent`}
          >
            show&nbsp;up.
          </span>
        </h1>

        <div
          className="msm-rise mt-9 flex flex-col items-center gap-4"
          style={{ animationDelay: "0.3s" }}
        >
          <a
            href="#discover"
            className={`font-outfit flex h-14 items-center gap-2 rounded-full px-8 text-[17px] font-semibold text-white shadow-[0_14px_36px_rgb(160_32_240/0.38)] transition hover:brightness-110 ${GRADIENT}`}
          >
            Explore what’s near you <ArrowDown className="h-4 w-4" />
          </a>
          <button
            type="button"
            onClick={handleListTimeClick}
            className="flex items-center gap-1.5 text-[15px] font-medium text-[#A5A8C3] transition hover:text-white"
          >
            or share something you love <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Community photos rotating on the horizon. Hover pauses. */}
      <div
        className="msm-rise relative mx-auto mt-auto h-[clamp(230px,min(62vw,38svh),300px)] w-full max-w-[980px] shrink-0 sm:h-[clamp(190px,min(26vw,40svh),340px)]"
        style={{ animationDelay: "0.5s" }}
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => setPaused(false)}
        role="region"
        aria-roledescription="carousel"
        aria-label="Photos from MySlotMate community events"
      >
        {MOMENTS.map(([src, caption], i) => {
          const slot = slotOf(i);
          const p = SLOTS[slot]!;
          return (
            <figure
              key={src}
              aria-hidden={slot !== 0}
              className="absolute top-[6%] left-1/2 w-[50%] transition-[transform,opacity] duration-[1100ms] ease-[cubic-bezier(.65,0,.25,1)] sm:w-[30%]"
              style={{
                transform: `translate(${p.x * 100}%, ${p.y * 100}%) rotate(${p.r}deg) scale(${p.s})`,
                opacity: p.o,
                zIndex: p.z,
              }}
            >
              <div
                className={`msm-float-${"abc"[i % 3]} relative rounded-[10px] bg-[#F8F7FF] p-[3%] pb-[12%] shadow-[0_30px_60px_rgb(0_0_0/0.55)]`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`People at a MySlotMate ${caption} event`}
                  loading={i < 3 ? "eager" : "lazy"}
                  className="aspect-[4/3] w-full rounded-[4px] object-cover"
                />
                <figcaption className="font-outfit absolute inset-x-0 bottom-[4%] text-center text-[clamp(10px,1.2vw,15px)] font-semibold text-[#1B1D33]">
                  {caption}
                </figcaption>
              </div>
            </figure>
          );
        })}
        {/* The photos sink into the horizon instead of ending at a hard edge. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[45%] bg-gradient-to-t from-[#080914] via-[#080914]/70 to-transparent"
        />
      </div>

      <BecomeHostModal
        open={showBecomeHostModal}
        onClose={closeBecomeHostModal}
      />
    </section>
  );
}
