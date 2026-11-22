import { Check, Lock, MapPin, Video } from "lucide-react";

/* Tiny, product-like previews: each card shows the feature, not an icon. */

const chip =
  "rounded-full border border-white/10 bg-[#1B1D33] px-2.5 py-1 text-[11px] font-semibold";

function Toggle() {
  return (
    <div className="flex rounded-full border border-white/10 bg-[#1B1D33] p-1 text-[11px] font-semibold">
      <span className="rounded-full bg-[#A020F0] px-3 py-1 text-white">
        Group
      </span>
      <span className="px-3 py-1 text-[#A5A8C3]">1:1</span>
    </div>
  );
}

function Tickets() {
  return (
    <div className="flex flex-col gap-1.5">
      {[
        ["Free", "text-emerald-300"],
        ["₹499", "text-[#D8B4FE]"],
      ].map(([t, c]) => (
        <span
          key={t}
          className={`relative rounded-md border border-dashed border-white/20 bg-[#1B1D33] px-3 py-1 text-xs font-bold ${c}`}
        >
          {t}
        </span>
      ))}
    </div>
  );
}

function Week() {
  const on = [false, false, true, false, false, true, false];
  return (
    <div>
      <div className="flex gap-1">
        {"MTWTFSS".split("").map((d, i) => (
          <span
            key={i}
            className={`grid h-6 w-6 place-items-center rounded-md text-[10px] font-bold ${on[i] ? "bg-[#A020F0] text-white" : "bg-[#1B1D33] text-[#777B98]"}`}
          >
            {d}
          </span>
        ))}
      </div>
      <p className="mt-1.5 text-[11px] text-[#A5A8C3]">Every Wed & Sat</p>
    </div>
  );
}

function Place() {
  return (
    <div className="flex flex-col gap-1.5">
      <span className={`${chip} flex items-center gap-1`}>
        <MapPin className="h-3 w-3 text-[#D8B4FE]" /> Café, Zoo Road
      </span>
      <span className={`${chip} flex items-center gap-1 text-[#A5A8C3]`}>
        <Video className="h-3 w-3" /> meet.google.com
      </span>
    </div>
  );
}

function Privacy() {
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-[#1B1D33] py-1 pr-1 pl-3 text-[11px] font-semibold">
      <Lock className="h-3 w-3 text-[#D8B4FE]" /> Private
      <span className="relative ml-1 h-5 w-9 rounded-full bg-[#A020F0]">
        <span className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-white" />
      </span>
    </div>
  );
}

function Request() {
  return (
    <div className="rounded-xl border border-white/10 bg-[#1B1D33] p-2">
      <div className="flex items-center gap-2">
        <span className="h-5 w-5 rounded-full bg-gradient-to-br from-amber-300 to-rose-400" />
        <span className="text-[11px] font-semibold">Riya wants to join</span>
      </div>
      <div className="mt-2 flex gap-1.5 text-[10px] font-bold">
        <span className="rounded-full bg-[#A020F0] px-2.5 py-0.5">Accept</span>
        <span className="rounded-full border border-white/15 px-2.5 py-0.5 text-[#A5A8C3]">
          Decline
        </span>
      </div>
    </div>
  );
}

function Chat() {
  return (
    <div className="flex w-[150px] flex-col gap-1.5 text-[11px]">
      <span className="w-fit rounded-2xl rounded-bl-sm bg-[#1B1D33] px-2.5 py-1 text-[#C9CBE0]">
        See you all at 6!
      </span>
      <span className="ml-auto w-fit rounded-2xl rounded-br-sm bg-[#A020F0] px-2.5 py-1">
        Bringing snacks 🍪
      </span>
    </div>
  );
}

// A fixed pattern so it renders the same on server and client.
const QR = "1110111 1010101 1110111 0001000 1101011 0110110 1011101";

function CheckIn() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid grid-cols-7 gap-[2px] rounded-md bg-white p-1.5">
        {QR.replace(/ /g, "")
          .split("")
          .map((b, i) => (
            <span
              key={i}
              className={`h-[5px] w-[5px] ${b === "1" ? "bg-[#080914]" : ""}`}
            />
          ))}
      </div>
      <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-300">
        <Check className="h-3.5 w-3.5" /> Checked in
      </span>
    </div>
  );
}

function Code() {
  return (
    <span className="rounded-lg border border-dashed border-[#D8B4FE]/60 bg-[#241333] px-3 py-1.5 font-mono text-xs font-bold tracking-wider text-[#D8B4FE]">
      FIRST20 · 20% off
    </span>
  );
}

function CoHost() {
  return (
    <div className="flex items-center">
      <span className="h-9 w-9 rounded-full border-2 border-[#121426] bg-gradient-to-br from-[#7B2FFF] to-[#BF00FF]" />
      <span className="-ml-3 h-9 w-9 rounded-full border-2 border-[#121426] bg-gradient-to-br from-amber-300 to-rose-400" />
      <span className="-ml-3 grid h-9 w-9 place-items-center rounded-full border-2 border-dashed border-white/25 bg-[#121426] text-sm text-[#A5A8C3]">
        +
      </span>
    </div>
  );
}

function Payout() {
  const bars = [30, 45, 38, 60, 52, 80];
  return (
    <div>
      <p className="font-outfit text-lg leading-none font-bold">₹8,250</p>
      <div className="mt-2 flex h-7 items-end gap-1">
        {bars.map((h, i) => (
          <span
            key={i}
            className={`w-2.5 rounded-sm ${i === bars.length - 1 ? "bg-[#A020F0]" : "bg-[#A020F0]/35"}`}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function Profile() {
  return (
    <div className="flex items-center gap-2">
      <span className="h-9 w-9 rounded-full bg-gradient-to-br from-[#7B2FFF] to-[#BF00FF]" />
      <div>
        <span className="block h-2 w-16 rounded-full bg-white/70" />
        <span className="mt-1.5 flex w-fit items-center gap-1 rounded-full bg-emerald-400/15 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">
          <Check className="h-2.5 w-2.5" /> Host
        </span>
      </div>
    </div>
  );
}

type Feature = { title: string; body: string; visual: React.ReactNode };

const ROW_A: Feature[] = [
  {
    title: "Group or one-on-one",
    body: "A full room, or one focused session.",
    visual: <Toggle />,
  },
  {
    title: "Free or paid tickets",
    body: "One price, or types like General and VIP.",
    visual: <Tickets />,
  },
  {
    title: "One-time or recurring",
    body: "A single date, a weekly series, or custom dates.",
    visual: <Week />,
  },
  {
    title: "In person or online",
    body: "Pin a place, or share a meeting link.",
    visual: <Place />,
  },
  {
    title: "Public or private",
    body: "List it for all, or invite only.",
    visual: <Privacy />,
  },
  {
    title: "Join requests",
    body: "Approve guests before they book.",
    visual: <Request />,
  },
];

const ROW_B: Feature[] = [
  {
    title: "Group chat",
    body: "Message everyone attending, in one place.",
    visual: <Chat />,
  },
  {
    title: "QR check-in",
    body: "Scan tickets at the door from your phone.",
    visual: <CheckIn />,
  },
  {
    title: "Discount codes",
    body: "Welcome first-timers, reward regulars.",
    visual: <Code />,
  },
  {
    title: "Co-hosting",
    body: "Run events with a friend or partner.",
    visual: <CoHost />,
  },
  {
    title: "Earnings & payouts",
    body: "Every booking, and where you get paid.",
    visual: <Payout />,
  },
  {
    title: "Your host page",
    body: "Who you are and everything you host.",
    visual: <Profile />,
  },
];

function Card({ f }: { f: Feature }) {
  return (
    <li className="flex w-[300px] shrink-0 flex-col justify-between gap-6 rounded-[24px] border border-white/[0.08] bg-[#121426]/90 p-5 backdrop-blur-md transition hover:border-[#652A91] sm:w-[340px]">
      <div className="flex min-h-[64px] items-center">{f.visual}</div>
      <div>
        <h3 className="font-outfit text-lg font-semibold text-white">
          {f.title}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-[#A5A8C3]">{f.body}</p>
      </div>
    </li>
  );
}

/**
 * A row that glides sideways forever. The list is rendered twice so the loop
 * is seamless; the copy is hidden from screen readers. Hover pauses it, and
 * with reduced motion it becomes a row you can scroll by hand.
 */
function Row({ items, reverse }: { items: Feature[]; reverse?: boolean }) {
  return (
    <div className="msm-marquee-wrap overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
      <div
        className={`msm-marquee flex w-max gap-4 ${reverse ? "msm-marquee-rev" : ""}`}
      >
        {[0, 1].map((copy) => (
          <ul
            key={copy}
            aria-hidden={copy === 1 || undefined}
            className="flex gap-4"
          >
            {items.map((f) => (
              <Card key={f.title} f={f} />
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}

/** Everything a host gets, as two gliding rows of feature previews. */
export default function HostTools() {
  return (
    <div className="flex flex-col gap-4">
      <Row items={ROW_A} />
      <Row items={ROW_B} reverse />
    </div>
  );
}
