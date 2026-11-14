"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowDown } from "lucide-react";
import { eventPriceLabel } from "~/lib/price";
import { formatIST } from "~/lib/datetime";
import type { EventDTO, PublicHostProfileDTO } from "~/lib/api";
import { BecomeHostModal } from "~/components/become-host";
import { useListTimeAction } from "~/hooks/useListTimeAction";
import { FALLBACK_PHOTOS, GRADIENT, coverOf, whenOf } from "./shared";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const PILL_WIDTHS = ["w-[1.62em]", "w-[1.2em]", "w-[1.9em]"];

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

/** A rounded photo set into the headline that slides to the next photo. */
function PhotoPill({
  photos,
  index,
  width,
  delay,
}: {
  photos: string[];
  index: number;
  width: string;
  delay: string;
}) {
  return (
    <span
      className={`msm-rise relative inline-block h-[0.78em] flex-none overflow-hidden rounded-full bg-[#1B1D33] ${width}`}
      style={{ animationDelay: delay }}
      aria-hidden
    >
      <span
        className="absolute inset-0 transition-transform duration-[900ms] ease-[cubic-bezier(.7,0,.2,1)]"
        style={{ transform: `translateY(-${(index % photos.length) * 100}%)` }}
      >
        {photos.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${src}-${i}`}
            src={src}
            alt=""
            className="absolute left-0 h-full w-full object-cover"
            style={{ top: `${i * 100}%` }}
          />
        ))}
      </span>
    </span>
  );
}

function BoardCard({
  event,
  host,
  i,
}: {
  event: EventDTO;
  host?: PublicHostProfileDTO;
  i: number;
}) {
  return (
    <Link
      href={`/experience/${event.slug}`}
      className="group w-[200px] flex-none overflow-hidden rounded-[20px] border border-white/[0.07] bg-[#121426] sm:w-[230px]"
    >
      <div className="relative aspect-[1/1.05] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={coverOf(event, i)}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        {event.session_type === "one_on_one" && (
          <span className="absolute top-2.5 left-2.5 rounded-full bg-[#080914]/75 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
            1:1 session
          </span>
        )}
      </div>
      <div className="grid gap-1.5 px-3.5 pt-3 pb-3.5">
        {host && (
          <p className="truncate text-xs font-semibold text-white/60">
            {host.first_name} {host.last_name}
          </p>
        )}
        <p className="font-outfit line-clamp-2 min-h-[2.5em] text-base leading-tight font-semibold text-white">
          {event.title}
        </p>
        <p className="flex justify-between text-xs text-white/45 tabular-nums">
          <span>{formatIST(whenOf(event), "EEE h:mm a")}</span>
          <b className="font-outfit text-sm text-[#D8B4FE]">
            {eventPriceLabel(event)}
          </b>
        </p>
      </div>
    </Link>
  );
}

/**
 * Logged-out home hero. Photos from real listings cycle inside the headline,
 * a board of upcoming slots scrolls underneath, and a toast surfaces listings
 * people booked this week (real `bookings_last_week`, never invented).
 */
export default function AnimatedHero({
  events,
  hostById,
}: {
  events: EventDTO[];
  hostById: Map<string, PublicHostProfileDTO>;
}) {
  const reduce = usePrefersReducedMotion();
  const { closeBecomeHostModal, handleListTimeClick, showBecomeHostModal } =
    useListTimeAction();

  // Three reels of four photos each, from real covers first.
  const reels = useMemo(() => {
    const covers = [
      ...new Set(events.map((e) => e.cover_image_url).filter(Boolean)),
    ] as string[];
    const pool = [...covers, ...FALLBACK_PHOTOS];
    return [0, 1, 2].map((r) =>
      [0, 1, 2, 3].map((k) => pool[(r + k * 3) % pool.length]!),
    );
  }, [events]);

  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => {
      if (!document.hidden) setTick((t) => t + 1);
    }, 2800);
    return () => window.clearInterval(id);
  }, [reduce]);

  const weekCount = useMemo(() => {
    const cutoff = Date.now() + WEEK_MS;
    return events.filter((e) => whenOf(e).getTime() <= cutoff).length;
  }, [events]);
  const countLabel =
    weekCount > 0
      ? `${weekCount} ${weekCount === 1 ? "slot" : "slots"} open this week`
      : `${events.length} upcoming slots`;

  const board = events.slice(0, 12);

  // Toasts only from listings that really had bookings in the last week.
  const popular = useMemo(
    () => events.filter((e) => (e.bookings_last_week ?? 0) > 0).slice(0, 6),
    [events],
  );
  const [toastIndex, setToastIndex] = useState(0);
  const [toastShown, setToastShown] = useState(false);
  useEffect(() => {
    if (popular.length === 0 || reduce) return;
    let hide: number | undefined;
    const show = () => {
      if (document.hidden) return;
      setToastShown(true);
      hide = window.setTimeout(() => {
        setToastShown(false);
        setToastIndex((i) => i + 1);
      }, 3400);
    };
    const first = window.setTimeout(show, 2600);
    const id = window.setInterval(show, 6000);
    return () => {
      window.clearTimeout(first);
      window.clearTimeout(hide);
      window.clearInterval(id);
    };
  }, [popular, reduce]);
  const toastEvent = popular[toastIndex % Math.max(1, popular.length)];

  return (
    <section
      aria-label="Welcome to MySlotMate"
      className="relative isolate w-full overflow-hidden pb-14"
    >
      <div className="msm-drift pointer-events-none absolute -top-44 -right-28 -z-10 h-[460px] w-[620px] rounded-full bg-[#A020F0]/40 blur-[110px]" />
      <div className="msm-drift-rev pointer-events-none absolute top-56 -left-56 -z-10 h-[420px] w-[520px] rounded-full bg-[#7B2FFF]/25 blur-[110px]" />

      <div className="mx-auto flex max-w-[1280px] flex-col items-center px-5 pt-10 text-center md:px-10 md:pt-14">
        <div
          className="msm-rise inline-flex items-center gap-2 rounded-full border border-[#652A91] bg-[#241333] py-1.5 pr-3.5 pl-3 text-[13px] font-semibold text-[#D8B4FE] tabular-nums"
          style={{ animationDelay: "0.05s" }}
        >
          <i className="msm-ping h-[7px] w-[7px] rounded-full bg-[#34D399]" />
          {countLabel}
        </div>

        <h1
          aria-label="Book people’s time."
          className="font-outfit mt-7 text-[clamp(44px,9.6vw,128px)] leading-[1.02] font-extrabold tracking-[-0.04em] text-white"
        >
          <span className="flex items-center justify-center gap-[0.16em]">
            <span className="msm-rise" style={{ animationDelay: "0.15s" }}>
              Book
            </span>
            <PhotoPill
              photos={reels[0]!}
              index={tick}
              width={PILL_WIDTHS[0]!}
              delay="0.3s"
            />
            <span className="msm-rise" style={{ animationDelay: "0.42s" }}>
              people’s
            </span>
          </span>
          <span className="flex items-center justify-center gap-[0.16em]">
            <PhotoPill
              photos={reels[1]!}
              index={tick}
              width={PILL_WIDTHS[1]!}
              delay="0.55s"
            />
            <span
              className={`msm-rise ${GRADIENT} bg-clip-text pr-[0.04em] text-transparent`}
              style={{ animationDelay: "0.68s" }}
            >
              time.
            </span>
            <PhotoPill
              photos={reels[2]!}
              index={tick}
              width={PILL_WIDTHS[2]!}
              delay="0.8s"
            />
          </span>
        </h1>

        <p
          className="msm-rise mt-6 max-w-[560px] text-[clamp(16px,1.6vw,19px)] leading-relaxed text-[#A5A8C3]"
          style={{ animationDelay: "0.95s" }}
        >
          Workshops, treks, communities and one-on-one sessions, hosted by real
          people near you. Pick a slot. Show up.
        </p>

        <div
          className="msm-rise mt-8 flex flex-wrap justify-center gap-3"
          style={{ animationDelay: "1.1s" }}
        >
          <a
            href="#discover"
            className={`msm-shine font-outfit relative flex h-14 items-center overflow-hidden rounded-full px-7 text-[17px] font-semibold text-white shadow-[0_12px_32px_rgb(160_32_240/0.4)] ${GRADIENT}`}
          >
            Find a slot this week
          </a>
          <button
            type="button"
            onClick={handleListTimeClick}
            className="font-outfit h-14 rounded-full border border-white/10 bg-[#121426]/60 px-7 text-[17px] font-semibold text-white transition hover:bg-[#1B1D33]"
          >
            Share your time
          </button>
        </div>
      </div>

      {board.length > 0 && (
        <>
          <div
            className="msm-rise mx-auto mt-16 flex max-w-[1280px] items-center justify-between px-5 text-xs font-bold tracking-[0.14em] text-[#777B98] uppercase md:px-10"
            style={{ animationDelay: "1.25s" }}
          >
            <span>Coming up</span>
            <a
              href="#discover"
              className="flex items-center gap-1 text-sm font-semibold tracking-normal text-[#D8B4FE] normal-case"
            >
              Browse all <ArrowDown className="h-3.5 w-3.5" />
            </a>
          </div>
          <div
            className="msm-board msm-rise mt-4 overflow-hidden"
            style={{ animationDelay: "1.35s" }}
          >
            <div className="msm-board-track flex w-max gap-[18px]">
              {[...board, ...board].map((e, i) => (
                <div
                  key={`${e.id}-${i}`}
                  aria-hidden={i >= board.length || undefined}
                  inert={i >= board.length || undefined}
                  className="contents"
                >
                  <BoardCard
                    event={e}
                    host={hostById.get(e.host_id)}
                    i={i % board.length}
                  />
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {toastEvent && (
        <div
          aria-live="polite"
          className={`pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 transition duration-500 sm:left-10 sm:translate-x-0 ${toastShown ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
        >
          <div className="flex items-center gap-3 rounded-2xl border border-[#652A91] bg-[#1B1D33]/95 py-2.5 pr-5 pl-2.5 shadow-[0_18px_40px_rgb(0_0_0/0.5)] backdrop-blur-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverOf(toastEvent)}
              alt=""
              className="h-9 w-9 rounded-full object-cover"
            />
            <div className="text-left">
              <b className="font-outfit block text-sm font-semibold text-white">
                {toastEvent.bookings_last_week} booked this week
              </b>
              <small className="text-xs text-[#D8B4FE]">
                {toastEvent.title}
              </small>
            </div>
          </div>
        </div>
      )}

      <BecomeHostModal
        open={showBecomeHostModal}
        onClose={closeBecomeHostModal}
      />
    </section>
  );
}
