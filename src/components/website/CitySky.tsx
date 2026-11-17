/**
 * Hero backdrop: a night sky over a city. Stars twinkle, shooting stars cross
 * now and then, and a few windows glow in the skyline below.
 *
 * Everything is generated from a fixed seed at module load, so the server and
 * the browser render identical markup (no hydration mismatch).
 */

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const W = 1440;
const H = 300;

type Rect = { x: number; y: number; w: number; h: number };

function buildSkyline() {
  const rnd = seeded(11);
  const far: Rect[] = [];
  const near: Rect[] = [];
  const windows: (Rect & { lit: boolean; delay: number })[] = [];

  for (let x = -20; x < W + 20; ) {
    const w = 40 + rnd() * 70;
    const h = 90 + rnd() * 150;
    far.push({ x, y: H - h - 30, w, h: h + 30 });
    x += w + 2;
  }

  for (let x = -10; x < W + 10; ) {
    const w = 46 + rnd() * 64;
    const h = 60 + rnd() * 130;
    const top = H - h;
    near.push({ x, y: top, w, h });
    const cols = Math.max(2, Math.floor((w - 12) / 12));
    const rows = Math.floor((h - 16) / 16);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (rnd() < 0.28) {
          windows.push({
            x: x + 8 + c * 12,
            y: top + 10 + r * 16,
            w: 5,
            h: 7,
            lit: rnd() < 0.7,
            delay: Math.round(rnd() * 80) / 10,
          });
        }
      }
    }
    x += w + 3;
  }
  return { far, near, windows };
}

function buildStars() {
  const rnd = seeded(23);
  return Array.from({ length: 70 }, () => ({
    l: Math.round(rnd() * 1000) / 10,
    t: Math.round(rnd() * 620) / 10,
    s: rnd() < 0.85 ? 1.5 : 2.5,
    d: Math.round(rnd() * 60) / 10,
  }));
}

const SKYLINE = buildSkyline();
const STARS = buildStars();

/** Shooting stars: start point, delay and cycle length (seconds). */
const SHOOTING = [
  { l: 78, t: 4, delay: 1.5, cycle: 9 },
  { l: 40, t: 2, delay: 5.5, cycle: 13 },
  { l: 95, t: 18, delay: 9, cycle: 16 },
];

export default function CitySky({
  skylineClass = "h-[46%]",
}: {
  /** Height of the skyline band, as a Tailwind class. */
  skylineClass?: string;
}) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      {/* Sky: deep navy at the top, violet dusk at the horizon. */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#080914_0%,#0A0B1C_40%,#1A0F33_75%,#2A1150_100%)]" />

      {STARS.map((s, i) => (
        <span
          key={i}
          className="msm-star absolute rounded-full bg-white"
          style={{
            left: `${s.l}%`,
            top: `${s.t}%`,
            width: s.s,
            height: s.s,
            animationDelay: `${s.d}s`,
          }}
        />
      ))}

      {SHOOTING.map((s, i) => (
        <span
          key={i}
          className="msm-shooting absolute h-px w-[160px] origin-left"
          style={{
            left: `${s.l}%`,
            top: `${s.t}%`,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.cycle}s`,
          }}
        />
      ))}

      {/* City glow behind the skyline. */}
      <div className="absolute inset-x-0 bottom-0 h-[60%] bg-[radial-gradient(55%_60%_at_50%_100%,rgb(160_32_240/0.42),rgb(123_47_255/0.12)_50%,transparent_78%)]" />

      {/* Kept low-contrast on purpose: a hint of a city, not a drawing of one. */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMax slice"
        className={`absolute inset-x-0 bottom-0 w-full opacity-55 ${skylineClass}`}
      >
        <defs>
          <linearGradient id="msm-far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#24174A" />
            <stop offset="1" stopColor="#0F0B22" />
          </linearGradient>
          <linearGradient id="msm-near" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#13142A" />
            <stop offset="1" stopColor="#080914" />
          </linearGradient>
        </defs>
        <g fill="url(#msm-far)" opacity="0.7">
          {SKYLINE.far.map((b, i) => (
            <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx="2" />
          ))}
        </g>
        <g fill="url(#msm-near)">
          {SKYLINE.near.map((b, i) => (
            <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx="3" />
          ))}
        </g>
        <g>
          {SKYLINE.windows.map((w, i) => (
            <rect
              key={i}
              x={w.x}
              y={w.y}
              width={w.w}
              height={w.h}
              rx="1"
              className={w.lit ? "msm-window" : undefined}
              fill={w.lit ? "#C4A5F5" : "#1E1F38"}
              opacity={w.lit ? 0.7 : 1}
              style={w.lit ? { animationDelay: `${w.delay}s` } : undefined}
            />
          ))}
        </g>
      </svg>

      {/* Ground: blends the city into the page. */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#080914] to-transparent" />
    </div>
  );
}
