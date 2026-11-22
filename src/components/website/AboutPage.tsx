import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import CitySky from "./CitySky";
import WebsiteFooter from "./WebsiteFooter";
import WebsiteNav from "./WebsiteNav";
import { GRADIENT } from "./shared";
import Reveal from "./about/Reveal";
import RotatingPhrase from "./about/RotatingPhrase";
import StarField from "./about/StarField";

/*
 * The About page is one story told in the night sky:
 * millions of stars are millions of moments around us we never notice;
 * MySlotMate connects the dots into one place; showing up turns a star into
 * a memory. The fixed StarField stays behind every chapter.
 */

/** Chapter 1: what's happening near you, one moment at a time. */
const UNSEEN_PHRASES = [
  "teaching pottery.",
  "leaving for a sunrise trek.",
  "setting a table for strangers.",
  "keeping an hour free to mentor.",
  "saving a chair at a crochet circle.",
  "tuning up for an open mic.",
  "painting with strangers on a Sunday.",
];

/** Chapter 1: real moments, out of focus until they come into view. */
const UNSEEN_PHOTOS = [
  "/Event Photos/Chrochet event/IMG_1142.webp",
  "/Event Photos/open-mic/openmic.webp",
  "/Event Photos/sip-and-paint/sip-and-paint.webp",
  "/Event Photos/open-mic/openmic2.webp",
  "/Event Photos/plate-to-fame/IMG-20260621-WA0069.webp",
];

/** Chapter 2: the constellation that draws the MySlotMate "M". */
const NODES = {
  a: [60, 300],
  b: [150, 70],
  c: [260, 190],
  d: [370, 70],
  e: [460, 300],
  f: [260, 262],
} as const;
type NodeKey = keyof typeof NODES;
const EDGES: [NodeKey, NodeKey][] = [
  ["a", "b"],
  ["b", "c"],
  ["c", "d"],
  ["d", "e"],
  ["c", "f"],
];
const NODE_LABELS: {
  node: NodeKey;
  text: string;
  dx: number;
  dy: number;
  anchor: "start" | "middle" | "end";
}[] = [
  { node: "b", text: "Experiences", dx: -14, dy: -18, anchor: "end" },
  { node: "c", text: "Communities", dx: 0, dy: -22, anchor: "middle" },
  { node: "d", text: "Professionals", dx: 14, dy: -18, anchor: "start" },
  { node: "f", text: "You", dx: 0, dy: 34, anchor: "middle" },
];

/** Chapter 3: real photos from MySlotMate events. */
const PHOTOS = [
  ["/Event Photos/sip-and-paint/sip-and-paint.webp", "Sip & Paint"],
  ["/Event Photos/plate-to-fame/IMG-20260621-WA0023.webp", "Plate to Fame"],
  ["/Event Photos/open-mic/openmic4.webp", "Open Mic"],
  ["/Event Photos/Chrochet event/IMG_1141.webp", "Crochet Circle"],
  ["/Event Photos/open-mic/openmic3.webp", "Open Mic"],
  ["/Event Photos/plate-to-fame/IMG-20260621-WA0051.webp", "Plate to Fame"],
  ["/Event Photos/Chrochet event/IMG_1134.webp", "Crochet Circle"],
  ["/Event Photos/plate-to-fame/IMG-20260621-WA0069.webp", "Plate to Fame"],
  ["/Event Photos/Chrochet event/IMG_1155.webp", "Crochet Circle"],
] as const;

/** Chapter 1: one week in Ria's life, a different day in every box. */
const WEEK = [
  [
    "mon",
    "Mon",
    "Commute",
    "Ria checks her phone in the back of a cab stuck in morning traffic",
  ],
  [
    "tue",
    "Tue",
    "Deadlines",
    "Ria types at her desk beside a tall stack of files",
  ],
  [
    "wed",
    "Wed",
    "Meetings",
    "Ria rests her head on her hand through another video call",
  ],
  [
    "thu",
    "Thu",
    "Late night",
    "Ria eats noodles at her desk in an empty office at night",
  ],
  [
    "fri",
    "Fri",
    "Cab home",
    "Ria dozes in a cab on the ride home through the city at night",
  ],
  [
    "sat",
    "Sat",
    "Errands",
    "Ria carries grocery bags and laundry while reading her to-do list",
  ],
  [
    "sun",
    "Sun",
    "Rest",
    "Ria lies on the sofa scrolling her phone, too tired to go out",
  ],
] as const;

/**
 * Seven days, one character: the week moves, nothing in it is for her. Seven
 * columns from `sm`, a swipeable row on phones so the art stays readable.
 */
function SameWeek() {
  return (
    <ol
      aria-label="Ria's week: commute, deadlines, meetings, late nights, a cab home, errands and a Sunday on the sofa"
      className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:mx-auto sm:grid sm:w-full sm:grid-cols-7 sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden"
    >
      {WEEK.map(([key, day, what, alt], i) => (
        <li
          key={key}
          className="msm-r flex w-[38vw] max-w-[160px] shrink-0 snap-start flex-col items-center gap-3 sm:w-auto sm:max-w-none"
          style={delay(0.15 + i * 0.07)}
        >
          <span className="text-[11px] font-semibold tracking-[0.16em] text-[#777B98] uppercase sm:text-xs">
            {day}
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/assets/illustrations/approved/ria-week-${key}.webp`}
            alt={alt}
            width={600}
            height={804}
            loading="lazy"
            decoding="async"
            className="aspect-[3/4] w-full rounded-xl bg-[#100E1C] object-cover ring-1 ring-white/[0.06]"
          />
          <span className="text-xs text-[#A5A8C3] sm:text-sm">{what}</span>
        </li>
      ))}
    </ol>
  );
}

/** Chapter 3: what people are trading their screens for. */
const SHIFT = [
  ["Feeds", "Long tables"],
  ["Likes", "Laughter"],
  ["Followers", "Friends"],
  ["Someday", "This Saturday"],
] as const;

const AUDIENCES = [
  {
    eyebrow: "Explorers",
    title: "Find something new, and the people behind it.",
    body: "Workshops, meetups, treks and one-on-one sessions near you. Make time for what matters.",
    href: "/#discover",
    cta: "Explore what’s near you",
    hl: false,
  },
  {
    eyebrow: "Hosts, creators and professionals",
    title: "Turn what you love into something people can book.",
    body: "Share a skill, a passion or years of expertise. Build a community and earn from it. Hosting is free.",
    href: "/become-host",
    cta: "Become a host",
    hl: true,
  },
];

const BELIEFS = [
  [
    "Human connection",
    "Technology should bring people closer in real life, not just connect their profiles.",
  ],
  [
    "Opportunity for everyone",
    "Everyone has a skill, passion or experience worth sharing.",
  ],
  [
    "Real-world discovery",
    "Move beyond scrolling and find experiences worth showing up for.",
  ],
  ["Meaningful time", "Make knowledge and expertise easy to find and book."],
  [
    "Community first",
    "Build spaces where shared interests become shared experiences.",
  ],
] as const;

const delay = (s: number) => ({ "--d": `${s}s` }) as React.CSSProperties;

function Chapter({ n, title }: { n: string; title: string }) {
  return (
    <p className="msm-r flex items-center gap-3 text-xs font-bold tracking-[0.18em] text-[#D8B4FE] uppercase">
      <span className="h-1.5 w-1.5 rounded-full bg-[#D8B4FE] shadow-[0_0_10px_#D8B4FE]" />
      {n} · {title}
    </p>
  );
}

function Star({ className = "" }: { className?: string }) {
  return (
    <span
      className={`block rounded-full bg-white shadow-[0_0_12px_3px_rgb(216_180_254/0.7)] ${className}`}
    />
  );
}

const H2 =
  "font-outfit msm-r mt-5 text-[clamp(32px,4.2vw,56px)] leading-[1.06] font-normal tracking-tight text-balance";

/** Public About page: the MySlotMate story, told in the night sky. */
export default function AboutPage() {
  return (
    <div className="relative isolate flex min-h-screen w-full flex-col bg-[#080914] font-[family-name:var(--font-inter)] text-white">
      <StarField />

      <div className="relative z-10">
        <WebsiteNav />
      </div>

      <main className="relative z-10">
        {/* Look up */}
        <section className="flex min-h-[calc(100svh-80px)] flex-col items-center justify-center px-5 pb-16 text-center md:px-10">
          <p className="msm-rise text-xs font-bold tracking-[0.2em] text-[#D8B4FE] uppercase">
            About MySlotMate
          </p>
          <h1
            className="font-outfit msm-rise mt-6 max-w-[14ch] text-[clamp(44px,7vw,100px)] leading-[1] font-light tracking-[-0.035em] text-balance"
            style={{ animationDelay: "0.1s" }}
          >
            Millions of stars.{" "}
            <span
              className={`${GRADIENT} bg-clip-text font-medium text-transparent`}
            >
              Millions of moments.
            </span>
          </h1>
          <p
            className="msm-rise mt-7 max-w-[540px] text-[clamp(16px,1.6vw,19px)] leading-relaxed text-[#A5A8C3]"
            style={{ animationDelay: "0.25s" }}
          >
            Every night the sky is full, and most of us never look up. The life
            around us is no different.
          </p>
          <a
            href="#routine"
            className="msm-rise mt-14 flex flex-col items-center gap-2 text-sm font-medium text-[#A5A8C3] transition hover:text-white"
            style={{ animationDelay: "0.45s" }}
          >
            Scroll to connect the dots
            <ArrowDown className="msm-float-a h-4 w-4" />
          </a>
        </section>

        {/* 01 The routine: one day on loop */}
        <section
          id="routine"
          className="mx-auto w-full max-w-[1100px] scroll-mt-10 px-5 py-24 md:px-10 md:py-32"
        >
          <Reveal className="flex flex-col items-center text-center">
            <Chapter n="01" title="The routine" />
            <h2
              className="font-outfit msm-r mt-6 text-[clamp(36px,6vw,80px)] leading-[1.04] font-light tracking-[-0.03em] text-balance"
              style={delay(0.1)}
            >
              Busy all week.{" "}
              <span
                className={`${GRADIENT} bg-clip-text font-medium text-transparent`}
              >
                Tired all weekend.
              </span>
            </h2>
          </Reveal>

          <Reveal className="mt-14" threshold={0.4}>
            <div className="mx-auto w-full max-w-[980px]" style={delay(0.2)}>
              <SameWeek />
            </div>
            <p
              className="msm-r mx-auto mt-12 max-w-[620px] text-center text-[17px] leading-relaxed text-balance text-[#A5A8C3]"
              style={delay(0.4)}
            >
              We didn’t stop wanting plans. We just ran out of energy to make
              them.
            </p>
          </Reveal>
        </section>

        {/* 02 Meanwhile: life happening without us */}
        <section
          id="unseen"
          className="mx-auto w-full max-w-[1200px] scroll-mt-10 px-5 py-24 md:px-10 md:py-32"
        >
          <Reveal className="flex flex-col items-center text-center">
            <Chapter n="02" title="Meanwhile" />
            <h2
              className="font-outfit msm-r mt-6 text-[clamp(28px,4.4vw,60px)] leading-[1.12] font-normal tracking-tight"
              style={delay(0.1)}
            >
              Right now, near you, someone is
              <br />
              <RotatingPhrase
                phrases={UNSEEN_PHRASES}
                className={`${GRADIENT} bg-clip-text font-medium text-transparent`}
              />
            </h2>
          </Reveal>

          {/* Real moments, blurred like distant stars, focus as they arrive. */}
          <Reveal
            className="mt-16 flex items-end justify-center gap-3 md:gap-5"
            threshold={0.3}
          >
            {UNSEEN_PHOTOS.map((src, i) => {
              const centre = i === 2;
              const edge = i === 0 || i === 4;
              return (
                <div
                  key={src}
                  className={`msm-r overflow-hidden rounded-t-full rounded-b-[28px] border border-white/10 ${centre ? "w-[30%] md:w-[22%]" : edge ? "hidden w-[16%] sm:block" : "w-[26%] md:w-[18%]"}`}
                  style={delay(Math.abs(i - 2) * 0.18)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt=""
                    loading="lazy"
                    className={`msm-focus w-full object-cover ${centre ? "aspect-[3/4.4]" : edge ? "aspect-[3/3.6]" : "aspect-[3/4]"}`}
                    style={delay(0.4 + Math.abs(i - 2) * 0.25)}
                  />
                </div>
              );
            })}
          </Reveal>

          <Reveal className="mt-12 flex justify-center">
            <p className="msm-r max-w-[520px] text-center text-[17px] leading-relaxed text-[#A5A8C3]">
              Every star is one of these moments. Most we scroll past. Some we
              save for later. The rest we never find.
            </p>
          </Reveal>
        </section>

        {/* 03 The shift: offline as a way of life */}
        <section className="mx-auto grid w-full max-w-[1200px] items-center gap-12 px-5 py-24 md:grid-cols-[1.05fr_1fr] md:gap-16 md:px-10 md:py-32">
          <Reveal>
            <Chapter n="03" title="The shift" />
            <h2 className={H2} style={delay(0.1)}>
              The more life moves online, the more we crave{" "}
              <span
                className={`${GRADIENT} bg-clip-text font-medium text-transparent`}
              >
                what can’t.
              </span>
            </h2>
            <p
              className="msm-r mt-6 max-w-[44ch] text-[17px] leading-relaxed text-[#A5A8C3]"
              style={delay(0.2)}
            >
              A phone can plan your week. It can’t save you a seat at a long
              table.
            </p>
            <p
              className="font-outfit msm-r mt-8 max-w-[30ch] border-l-2 border-[#A020F0] pl-5 text-[clamp(19px,1.8vw,23px)] leading-snug font-light text-white"
              style={delay(0.3)}
            >
              Offline isn’t a break from life. It’s how we want to live.
            </p>
          </Reveal>

          <Reveal threshold={0.3}>
            <div className="msm-r overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#121426]/80 backdrop-blur-md">
              <div className="grid grid-cols-[1fr_36px_1.2fr] items-center gap-3 border-b border-white/[0.08] px-5 py-4 text-[11px] font-semibold tracking-[0.18em] uppercase sm:grid-cols-[1fr_40px_1fr] sm:gap-4 sm:px-8">
                <span className="text-[#777B98]">Less of</span>
                <span aria-hidden />
                <span className="text-[#D8B4FE]">More of</span>
              </div>
              <ul className="divide-y divide-white/[0.06]">
                {SHIFT.map(([from, to], i) => (
                  <li
                    key={from}
                    className="msm-r grid grid-cols-[1fr_36px_1.2fr] items-center gap-3 px-5 py-6 sm:grid-cols-[1fr_40px_1fr] sm:gap-4 sm:px-8"
                    style={delay(0.2 + i * 0.12)}
                  >
                    <span className="font-outfit text-[clamp(18px,1.9vw,23px)] font-light text-[#777B98] line-through decoration-[#777B98]/60">
                      {from}
                    </span>
                    <span className="flex h-9 w-9 items-center justify-center justify-self-center rounded-full border border-[#652A91]/70 bg-[#241333]">
                      <ArrowRight className="h-4 w-4 text-[#D8B4FE]" />
                    </span>
                    <span className="font-outfit text-[clamp(18px,1.9vw,23px)] font-medium whitespace-nowrap text-white">
                      {to}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </section>

        {/* 04 Connected */}
        <section className="mx-auto grid w-full max-w-[1200px] items-center gap-12 px-5 py-24 md:grid-cols-[1fr_1.1fr] md:px-10 md:py-32">
          <Reveal>
            <Chapter n="04" title="Connected" />
            <h2 className={H2} style={delay(0.1)}>
              MySlotMate connects the dots.
            </h2>
            <p
              className="msm-r mt-5 text-[17px] leading-relaxed text-[#A5A8C3]"
              style={delay(0.2)}
            >
              One place for the events, communities and people of Northeast
              India. Find what’s on, share what you love, meet who’s behind it.
            </p>
          </Reveal>

          <Reveal threshold={0.35}>
            <svg
              viewBox="0 0 520 340"
              className="w-full overflow-visible"
              role="img"
              aria-label="A constellation in the shape of the MySlotMate M, linking experiences, communities, professionals and you"
            >
              <defs>
                <radialGradient id="msm-node-glow">
                  <stop offset="0" stopColor="#D8B4FE" stopOpacity="0.9" />
                  <stop offset="1" stopColor="#D8B4FE" stopOpacity="0" />
                </radialGradient>
              </defs>
              {EDGES.map(([from, to], i) => (
                <line
                  key={`${from}${to}`}
                  x1={NODES[from][0]}
                  y1={NODES[from][1]}
                  x2={NODES[to][0]}
                  y2={NODES[to][1]}
                  pathLength={1}
                  className="msm-draw"
                  stroke="#C4A5F5"
                  strokeOpacity="0.75"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  style={delay(0.2 + i * 0.35)}
                />
              ))}
              {(Object.keys(NODES) as NodeKey[]).map((k, i) => (
                <g key={k} className="msm-r" style={delay(i * 0.25)}>
                  <circle
                    cx={NODES[k][0]}
                    cy={NODES[k][1]}
                    r="18"
                    fill="url(#msm-node-glow)"
                  />
                  <circle
                    cx={NODES[k][0]}
                    cy={NODES[k][1]}
                    r={k === "f" ? 5 : 4}
                    fill="#fff"
                  />
                </g>
              ))}
              {NODE_LABELS.map((l, i) => (
                <text
                  key={l.text}
                  x={NODES[l.node][0] + l.dx}
                  y={NODES[l.node][1] + l.dy}
                  textAnchor={l.anchor}
                  className="msm-r font-outfit fill-white text-[17px] font-semibold"
                  style={delay(1.4 + i * 0.2)}
                >
                  {l.text}
                </text>
              ))}
            </svg>
          </Reveal>
        </section>

        {/* 05 Real life: one gliding row of real event photos */}
        <section className="w-full py-20 md:py-28">
          <Reveal className="mx-auto flex max-w-[680px] flex-col items-center px-5 text-center">
            <Chapter n="05" title="Real life" />
            <h2 className={H2} style={delay(0.1)}>
              When you show up, a star becomes a memory.
            </h2>
          </Reveal>

          <Reveal className="mt-12">
            <div
              className="msm-r msm-marquee-wrap overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]"
              style={delay(0.2)}
            >
              {/* Rendered twice for a seamless loop; the copy is hidden from
                  screen readers. Hover pauses it. */}
              <div className="msm-marquee flex w-max gap-4">
                {[0, 1].map((copy) => (
                  <ul
                    key={copy}
                    aria-hidden={copy === 1 || undefined}
                    className="flex gap-4"
                  >
                    {PHOTOS.map(([src, caption]) => (
                      <li
                        key={src}
                        className="group relative w-[220px] shrink-0 overflow-hidden rounded-[22px] border border-white/10 md:w-[260px]"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={src}
                          alt={
                            copy === 0
                              ? `People at a MySlotMate ${caption} event`
                              : ""
                          }
                          loading="lazy"
                          className="aspect-[4/5] w-full object-cover transition duration-700 group-hover:scale-105"
                        />
                        <span className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-[#080914]/90 to-transparent px-4 pt-10 pb-4 text-sm font-semibold">
                          <Star className="h-1.5 w-1.5" />
                          {caption}
                        </span>
                      </li>
                    ))}
                  </ul>
                ))}
              </div>
            </div>
          </Reveal>
        </section>

        {/* 06 Everyone */}
        <section className="mx-auto w-full max-w-[1200px] px-5 py-24 md:px-10 md:py-32">
          <Reveal className="max-w-[640px]">
            <Chapter n="06" title="Everyone" />
            <h2 className={H2} style={delay(0.1)}>
              Some come to find. Some come to share.
            </h2>
          </Reveal>
          <Reveal className="mt-12 grid gap-6 md:grid-cols-2">
            {AUDIENCES.map((a, i) => (
              <div
                key={a.eyebrow}
                className={`msm-r flex flex-col gap-4 rounded-[28px] border p-8 backdrop-blur-md md:p-10 ${a.hl ? "border-[#652A91] bg-[#241333]/70" : "border-white/10 bg-[#121426]/70"}`}
                style={delay(i * 0.15)}
              >
                <p className="text-xs font-bold tracking-[0.16em] text-[#D8B4FE] uppercase">
                  {a.eyebrow}
                </p>
                <h3 className="font-outfit text-[clamp(24px,2.6vw,32px)] leading-tight font-semibold">
                  {a.title}
                </h3>
                <p className="text-base leading-relaxed text-[#A5A8C3]">
                  {a.body}
                </p>
                <Link
                  href={a.href}
                  className="font-outfit mt-auto flex w-fit items-center gap-1.5 pt-3 text-base font-semibold text-[#D8B4FE] hover:text-white"
                >
                  {a.cta} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </Reveal>
        </section>

        {/* 07 What guides us: a vertical constellation */}
        <section className="mx-auto w-full max-w-[860px] px-5 py-24 md:px-10 md:py-32">
          <Reveal>
            <Chapter n="07" title="What guides us" />
            <h2 className={H2} style={delay(0.1)}>
              True to people, not platforms.
            </h2>
          </Reveal>
          <Reveal className="relative mt-14 pl-10" threshold={0.2}>
            <span
              aria-hidden
              className="msm-line absolute top-2 bottom-2 left-[5px] w-px bg-gradient-to-b from-[#D8B4FE] via-[#A020F0]/60 to-transparent"
            />
            <ol className="flex flex-col gap-10">
              {BELIEFS.map(([title, body], i) => (
                <li
                  key={title}
                  className="msm-r relative"
                  style={delay(0.2 + i * 0.18)}
                >
                  <Star className="absolute top-2 -left-10 h-[11px] w-[11px]" />
                  <h3 className="font-outfit text-2xl font-semibold">
                    {title}
                  </h3>
                  <p className="mt-2 max-w-[520px] text-base leading-relaxed text-[#A5A8C3]">
                    {body}
                  </p>
                </li>
              ))}
            </ol>
          </Reveal>
        </section>

        {/* 08 Your star: back down to the city */}
        <section className="relative isolate flex min-h-[90svh] flex-col items-center overflow-hidden px-5 pt-24 pb-56 text-center md:pt-32">
          <CitySky skylineClass="h-[42%]" />
          <Reveal className="flex flex-col items-center">
            <Chapter n="08" title="Your star" />
            <h2
              className="font-outfit msm-r mt-6 max-w-[16ch] text-[clamp(36px,5.4vw,76px)] leading-[1.02] font-light tracking-[-0.03em] text-balance"
              style={delay(0.1)}
            >
              Your star is out there.{" "}
              <span
                className={`${GRADIENT} bg-clip-text font-medium text-transparent`}
              >
                Go meet it.
              </span>
            </h2>
            <p
              className="msm-r mt-6 max-w-[520px] text-[17px] leading-relaxed text-[#A5A8C3]"
              style={delay(0.2)}
            >
              Time is the one thing we never get back. Spend more of it offline.
            </p>
            <div
              className="msm-r mt-10 flex flex-wrap justify-center gap-3"
              style={delay(0.3)}
            >
              <Link
                href="/#discover"
                className={`font-outfit flex items-center rounded-full px-7 py-3.5 text-base font-semibold text-white shadow-[0_14px_36px_rgb(160_32_240/0.38)] ${GRADIENT}`}
              >
                Find something to do
              </Link>
              <Link
                href="/become-host"
                className="font-outfit flex items-center rounded-full border border-white/15 bg-[#080914]/40 px-7 py-3.5 text-base font-semibold text-white backdrop-blur transition hover:bg-white/5"
              >
                Become a host
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      <div className="relative z-10">
        <WebsiteFooter />
      </div>
    </div>
  );
}
