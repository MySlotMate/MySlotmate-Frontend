import { ArrowDown, Check, ChevronDown } from "lucide-react";
import CitySky from "../CitySky";
import WebsiteFooter from "../WebsiteFooter";
import WebsiteNav from "../WebsiteNav";
import Reveal from "../about/Reveal";
import StarField from "../about/StarField";
import { GRADIENT } from "../shared";
import HostTools from "./HostTools";
import StartHostingButton from "./StartHostingButton";

const delay = (s: number) => ({ "--d": `${s}s` }) as React.CSSProperties;

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="msm-r flex items-center gap-3 text-xs font-bold tracking-[0.18em] text-[#D8B4FE] uppercase">
      <span className="h-1.5 w-1.5 rounded-full bg-[#D8B4FE] shadow-[0_0_10px_#D8B4FE]" />
      {children}
    </p>
  );
}

const H2 =
  "font-outfit msm-r mt-5 text-[clamp(32px,4.2vw,54px)] leading-[1.06] font-normal tracking-tight text-balance";

/** What a host pays to use MySlotMate: nothing, line by line. */
const FREE = [
  ["Sign-up fee", "₹0"],
  ["Listing fee", "₹0"],
  ["Commission on bookings", "0%"],
] as const;

/** What people host: real MySlotMate events where we have them. */
const KINDS = [
  {
    title: "Workshops",
    tags: ["Painting", "Pottery", "Cooking"],
    src: "/Event Photos/sip-and-paint/sip-and-paint.webp",
  },
  {
    title: "Communities & meetups",
    tags: ["Book clubs", "Crochet", "Run clubs"],
    src: "/Event Photos/Chrochet event/IMG_1141.webp",
  },
  {
    title: "Food & tables",
    tags: ["Supper clubs", "Tastings", "Long tables"],
    src: "/Event Photos/plate-to-fame/IMG-20260621-WA0023.webp",
  },
  {
    title: "Performances",
    tags: ["Open mics", "Jams", "Small shows"],
    src: "/Event Photos/open-mic/openmic.webp",
  },
  {
    title: "Adventures",
    tags: ["Treks", "Cycling", "Sunrise walks"],
    src: "/Event Photos/adventure/adventure.webp",
    // Keep the group in frame, not the doorway above them.
    pos: "50% 75%",
  },
  {
    title: "One-on-one sessions",
    tags: ["Coaching", "Mentoring", "Lessons"],
    src: "/Event Photos/one-on-one/one-on-one.webp",
  },
] as const;

const STEPS = [
  {
    title: "Apply in a few minutes",
    body: "Tell us who you are, what you’d like to host, how often, and for how many people. Add your social links if you have them, and verify your phone number.",
  },
  {
    title: "We review your profile",
    body: "A real person from our team reads every application, usually within 24–48 hours. You’ll see your status on the same page.",
  },
  {
    title: "Create your first event",
    body: "Add photos, a short hook and what guests will experience. Pick a place or an online link, set your dates and choose your price, or make it free.",
  },
  {
    title: "Welcome your guests",
    body: "Guests discover and book your event. Approve join requests if you want to, chat with everyone in one group, and scan tickets at the door.",
  },
  {
    title: "Get paid, keep growing",
    body: "Add a payout method and track your earnings in the dashboard. Hosting is free, so what you earn from your tickets is yours.",
  },
] as const;

const FAQS = [
  {
    q: "Is hosting really free?",
    a: "Yes. There’s no fee to sign up, no fee to list an event, and no commission taken from your bookings. Hosting on MySlotMate is completely free. If you’re GST-registered or sell over ₹5 lakh a year, the law requires us to deduct a small amount of tax (GST TCS, income tax TDS) from payouts; it’s credited back to you, not kept by us.",
  },
  {
    q: "Who can host?",
    a: "Anyone with something worth sharing: creators, teachers, professionals, community organisers, or someone with a hobby they love. You don’t need to be a business.",
  },
  {
    q: "How long does the review take?",
    a: "Usually 24–48 hours. You can check your application status any time on the host application page.",
  },
  {
    q: "Where can I host?",
    a: "Anywhere in Northeast India, from Guwahati and Shillong to Gangtok, Aizawl, Imphal, Kohima, Itanagar and Agartala. You can also host online.",
  },
  {
    q: "Can I host free events?",
    a: "Of course. Choose Free when you set your price, and guests can reserve a slot without paying.",
  },
  {
    q: "How do I get paid for paid events?",
    a: "Add a payout method in your host dashboard’s Earnings section. You can see every booking and what you’ve earned there.",
  },
  {
    q: "Can I decide who joins?",
    a: "Yes. Turn on join requests and approve each guest, or make the event private so only people you share it with can find it.",
  },
] as const;

/** Public "Host with us" page: how hosting on MySlotMate works. */
export default function HostWithUsPage() {
  return (
    <div className="relative isolate flex min-h-screen w-full flex-col bg-[#080914] font-[family-name:var(--font-inter)] text-white">
      <StarField />
      <div className="relative z-10 flex flex-1 flex-col">
        <WebsiteNav />

        <main className="flex-1">
          {/* FAQ rich results: the same questions shown on the page. */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                mainEntity: FAQS.map((f) => ({
                  "@type": "Question",
                  name: f.q,
                  acceptedAnswer: { "@type": "Answer", text: f.a },
                })),
              }),
            }}
          />
          {/* Hero */}
          <section className="mx-auto grid w-full max-w-[1280px] items-center gap-10 px-5 pt-14 pb-20 md:grid-cols-[1.05fr_1fr] md:px-10 md:pt-20 md:pb-28">
            <Reveal>
              <Eyebrow>Host with us</Eyebrow>
              <h1
                className="font-outfit msm-r mt-6 text-[clamp(40px,6vw,80px)] leading-[1.02] font-light tracking-[-0.03em] text-balance"
                style={delay(0.1)}
              >
                Share what you love.{" "}
                <span
                  className={`${GRADIENT} bg-clip-text font-medium text-transparent`}
                >
                  We’ll bring the people.
                </span>
              </h1>
              <p
                className="msm-r mt-6 max-w-[520px] text-lg leading-relaxed text-[#A5A8C3]"
                style={delay(0.2)}
              >
                Run a workshop, a meetup, an open mic or a one-on-one session.
                Set your own date and price, and meet the people near you who
                want exactly that.
              </p>
              <div
                className="msm-r mt-9 flex flex-wrap items-center gap-3"
                style={delay(0.3)}
              >
                <StartHostingButton />
                <a
                  href="#how-it-works"
                  className="font-outfit flex h-12 items-center gap-1.5 rounded-full border border-white/15 px-6 text-base font-semibold transition hover:bg-white/5"
                >
                  How it works <ArrowDown className="h-4 w-4" />
                </a>
              </div>
              <p
                className="msm-r mt-6 flex items-center gap-2 text-sm text-[#A5A8C3]"
                style={delay(0.4)}
              >
                <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-400/15 text-emerald-300">
                  <Check className="h-3 w-3" />
                </span>
                Free for hosts. No fees, no commission.
              </p>
            </Reveal>
            <Reveal className="mx-auto w-full max-w-[640px]">
              <div className="msm-r" style={delay(0.3)}>
                {/* Approved master illustration, generated with Magnific. Still for
                    now: animation needs a paid Magnific plan. Edges fade into
                    the page so its slightly lighter background never shows a
                    box. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/assets/illustrations/approved/host-cafe-conversation.webp"
                  alt="A host leaning in to explain something to a laughing guest over coffee in a café at night"
                  width={1152}
                  height={864}
                  fetchPriority="high"
                  className="h-auto w-full [mask-image:radial-gradient(ellipse_62%_60%_at_52%_54%,#000_55%,transparent_96%)]"
                />
              </div>
            </Reveal>
          </section>

          {/* Free: an event-ticket stub that adds up to ₹0 */}
          <section
            aria-labelledby="free-title"
            className="mx-auto w-full max-w-[1100px] px-5 md:px-10"
          >
            <Reveal>
              <div className="msm-r relative grid overflow-hidden rounded-[28px] shadow-[0_30px_90px_-40px_rgb(160_32_240/0.75)] md:grid-cols-[280px_1fr]">
                {/* Stub */}
                <div className="relative isolate flex h-[170px] flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#7B2FFF] via-[#8420DC] to-[#5A12A0] text-white md:h-auto md:py-10">
                  <div
                    aria-hidden
                    className="absolute -top-16 -left-10 -z-10 h-48 w-48 rounded-full bg-[#BF00FF]/50 blur-[70px]"
                  />
                  <p
                    aria-hidden
                    className="font-outfit text-[clamp(84px,9vw,112px)] leading-[0.9] font-medium tracking-[-0.06em]"
                  >
                    ₹0
                  </p>
                  <p className="mt-3 text-[11px] font-bold tracking-[0.2em] text-white/80 uppercase">
                    Admit every host
                  </p>
                </div>

                {/* Body */}
                <div className="grid items-center gap-8 border-t-2 border-dashed border-white/15 bg-[#121426] px-6 py-8 md:border-t-0 md:border-l-2 md:px-10 md:py-10 lg:grid-cols-[1fr_260px] lg:gap-10">
                  <div>
                    <h2
                      id="free-title"
                      className="font-outfit text-[clamp(26px,2.8vw,36px)] leading-[1.1] font-normal tracking-tight text-balance"
                    >
                      Hosting is{" "}
                      <span
                        className={`${GRADIENT} bg-clip-text font-medium text-transparent`}
                      >
                        completely free.
                      </span>
                    </h2>
                    <p className="mt-3 max-w-[40ch] text-base leading-relaxed text-[#A5A8C3]">
                      We want more people sharing what they love, so we don’t
                      charge hosts anything.
                    </p>
                    <p className="mt-3 max-w-[48ch] text-xs leading-5 text-[#777B98]">
                      Taxes the government requires us to deduct for you (GST
                      TCS, income tax TDS) apply only if you’re GST-registered
                      or sell over ₹5 lakh a year, and are credited back to
                      you.
                    </p>
                  </div>

                  <dl className="font-outfit text-[15px]">
                    {FREE.map(([label, value]) => (
                      <div
                        key={label}
                        className="flex items-baseline gap-2 py-1.5 text-[#A5A8C3]"
                      >
                        <dt>{label}</dt>
                        <span
                          aria-hidden
                          className="flex-1 translate-y-[-3px] border-b border-dotted border-white/20"
                        />
                        <dd className="font-medium text-white">{value}</dd>
                      </div>
                    ))}
                    <div className="mt-2 flex items-baseline justify-between border-t border-white/15 pt-3">
                      <dt className="text-sm font-semibold tracking-[0.12em] text-[#D8B4FE] uppercase">
                        You pay
                      </dt>
                      <dd className="text-[28px] leading-none font-medium text-white">
                        ₹0
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Ticket notches where stub meets body */}
                <span
                  aria-hidden
                  className="absolute top-[170px] -left-3.5 h-7 w-7 -translate-y-1/2 rounded-full bg-[#080914] md:top-[-14px] md:left-[280px] md:-translate-x-1/2 md:translate-y-0"
                />
                <span
                  aria-hidden
                  className="absolute top-[170px] -right-3.5 h-7 w-7 -translate-y-1/2 rounded-full bg-[#080914] md:top-auto md:right-auto md:bottom-[-14px] md:left-[280px] md:-translate-x-1/2 md:translate-y-0"
                />
              </div>
            </Reveal>
          </section>

          {/* What you can host */}
          <section className="mx-auto w-full max-w-[1280px] px-5 py-24 md:px-10 md:py-32">
            <Reveal className="max-w-[640px]">
              <Eyebrow>What you can host</Eyebrow>
              <h2 className={H2} style={delay(0.1)}>
                If you love it, someone near you wants to try it.
              </h2>
            </Reveal>
            <Reveal
              className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
              threshold={0.1}
            >
              {KINDS.map((k, i) => (
                <figure
                  key={k.title}
                  className="msm-r group relative overflow-hidden rounded-[28px] border border-white/10"
                  style={delay((i % 3) * 0.12)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={k.src}
                    alt=""
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover transition duration-700 group-hover:scale-105"
                    style={"pos" in k ? { objectPosition: k.pos } : undefined}
                  />
                  {/* Scrim: dark at the bottom so the caption reads on any photo */}
                  <div
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-[#080914] via-[#080914]/75 to-transparent"
                  />
                  <figcaption className="absolute inset-x-0 bottom-0 p-5 md:p-6">
                    <h3 className="font-outfit text-[22px] leading-tight font-medium md:text-2xl">
                      {k.title}
                    </h3>
                    <ul className="mt-3 flex flex-wrap gap-1.5">
                      {k.tags.map((t) => (
                        <li
                          key={t}
                          className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[13px] font-medium text-white/90 backdrop-blur-md"
                        >
                          {t}
                        </li>
                      ))}
                    </ul>
                  </figcaption>
                </figure>
              ))}
            </Reveal>
          </section>

          {/* How it works */}
          <section
            id="how-it-works"
            className="mx-auto grid w-full max-w-[1280px] scroll-mt-10 gap-12 px-5 pb-24 md:grid-cols-[0.9fr_1.1fr] md:px-10 md:pb-32"
          >
            <Reveal className="md:sticky md:top-16 md:self-start">
              <Eyebrow>How it works</Eyebrow>
              <h2 className={H2} style={delay(0.1)}>
                From an idea to a room full of people.
              </h2>
              <p
                className="msm-r mt-5 max-w-[440px] text-[17px] leading-relaxed text-[#A5A8C3]"
                style={delay(0.2)}
              >
                Five steps, and we’re with you for each of them.
              </p>
            </Reveal>
            <Reveal className="relative pl-14" threshold={0.15}>
              <span
                aria-hidden
                className="msm-line absolute top-3 bottom-3 left-[19px] w-px bg-gradient-to-b from-[#D8B4FE] via-[#A020F0]/60 to-transparent"
              />
              <ol className="flex flex-col gap-12">
                {STEPS.map((s, i) => (
                  <li
                    key={s.title}
                    className="msm-r relative"
                    style={delay(0.15 + i * 0.15)}
                  >
                    <span className="font-outfit absolute top-0 -left-14 grid h-10 w-10 place-items-center rounded-full border border-[#652A91] bg-[#241333] text-sm font-bold text-[#D8B4FE] shadow-[0_0_24px_rgb(160_32_240/0.35)]">
                      {i + 1}
                    </span>
                    <h3 className="font-outfit pt-1.5 text-2xl font-semibold">
                      {s.title}
                    </h3>
                    <p className="mt-2 max-w-[520px] text-base leading-relaxed text-[#A5A8C3]">
                      {s.body}
                    </p>
                  </li>
                ))}
              </ol>
            </Reveal>
          </section>

          {/* Tools: two gliding rows instead of a tall grid */}
          <section className="pb-24 md:pb-32">
            <Reveal className="mx-auto w-full max-w-[1280px] px-5 md:px-10">
              <Eyebrow>Everything you need</Eyebrow>
              <h2 className={`${H2} max-w-[640px]`} style={delay(0.1)}>
                Tools that stay out of your way.
              </h2>
              <p
                className="msm-r mt-5 max-w-[440px] text-[17px] leading-relaxed text-[#A5A8C3]"
                style={delay(0.2)}
              >
                Everything here is included, and all of it is free.
              </p>
            </Reveal>
            <Reveal className="mt-12">
              <div className="msm-r" style={delay(0.2)}>
                <HostTools />
              </div>
            </Reveal>
          </section>

          {/* FAQ */}
          <section className="mx-auto w-full max-w-[860px] px-5 pb-24 md:px-10 md:pb-32">
            <Reveal className="text-center">
              <div className="flex justify-center">
                <Eyebrow>Questions</Eyebrow>
              </div>
              <h2 className={H2} style={delay(0.1)}>
                Good to know.
              </h2>
            </Reveal>
            <div className="mt-12 flex flex-col gap-3">
              {FAQS.map((f, i) => (
                <details
                  key={f.q}
                  open={i === 0}
                  className="group rounded-[22px] border border-white/[0.08] bg-[#121426]/80 px-6 backdrop-blur-md transition open:border-[#652A91]"
                >
                  <summary className="font-outfit flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-lg font-semibold [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <ChevronDown className="h-5 w-5 shrink-0 text-[#A5A8C3] transition group-open:rotate-180" />
                  </summary>
                  <p className="pb-6 text-base leading-relaxed text-[#A5A8C3]">
                    {f.a}
                  </p>
                </details>
              ))}
            </div>
          </section>

          {/* Closing */}
          <section className="relative isolate flex min-h-[70svh] flex-col items-center overflow-hidden px-5 pt-20 pb-52 text-center">
            <CitySky skylineClass="h-[42%]" />
            <Reveal className="flex flex-col items-center">
              <h2 className="font-outfit msm-r max-w-[18ch] text-[clamp(34px,5vw,68px)] leading-[1.04] font-light tracking-[-0.03em] text-balance">
                Your event could be someone’s{" "}
                <span
                  className={`${GRADIENT} bg-clip-text font-medium text-transparent`}
                >
                  best evening this month.
                </span>
              </h2>
              <p
                className="msm-r mt-5 text-[17px] text-[#A5A8C3]"
                style={delay(0.1)}
              >
                It’s free to start, and it takes a few minutes.
              </p>
              <div className="msm-r mt-9" style={delay(0.2)}>
                <StartHostingButton label="Apply to host" />
              </div>
            </Reveal>
          </section>
        </main>

        <WebsiteFooter />
      </div>
    </div>
  );
}
