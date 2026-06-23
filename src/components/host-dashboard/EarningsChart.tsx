"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LuTrendingUp, LuTrendingDown } from "react-icons/lu";

/* ------------------------------------------------------------------ */
/*  Lightweight, dependency-free trend chart for the host overview.    */
/*  Renders a smooth area + line for either earnings or bookings over   */
/*  the trailing months, with an interactive hover tooltip. Built with  */
/*  raw SVG so we don't pull in a charting library.                     */
/*                                                                      */
/*  The SVG is drawn at the container's real pixel width (measured via  */
/*  ResizeObserver) rather than a scaled viewBox, so axis labels and    */
/*  stroke widths stay crisp at every screen size — including mobile.   */
/* ------------------------------------------------------------------ */

export interface ChartPoint {
  /** Short axis label, e.g. "Jun". */
  label: string;
  /** Earnings for the bucket, in paise/cents. */
  earnings: number;
  /** Booking count for the bucket. */
  bookings: number;
}

type Metric = "earnings" | "bookings";

// Kept compact on purpose — for most hosts this panel is empty most of the
// time, so it shouldn't dominate the dashboard. The empty state collapses to
// a short strip (EMPTY_H) instead of rendering a tall, barren grid.
const HEIGHT = 150;
const EMPTY_H = 52;
const PAD_L = 44;
const PAD_R = 12;
const PAD_T = 12;
const PAD_B = 22;

function compactINR(cents: number): string {
  const r = cents / 100;
  if (r >= 1_00_00_000) return `₹${(r / 1_00_00_000).toFixed(1)}Cr`;
  if (r >= 1_00_000) return `₹${(r / 1_00_000).toFixed(1)}L`;
  if (r >= 1_000) return `₹${(r / 1_000).toFixed(1)}k`;
  return `₹${Math.round(r)}`;
}

function fullINR(cents: number): string {
  return `₹${(cents / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

/** Round up to a visually pleasant axis ceiling (1, 2, 5 × 10ⁿ). */
function niceCeil(v: number): number {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

/** Catmull-Rom → cubic Bézier so the line reads as a smooth curve. */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0]!.x} ${pts[0]!.y}`;
  let d = `M ${pts[0]!.x} ${pts[0]!.y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export default function EarningsChart({ points }: { points: ChartPoint[] }) {
  const [metric, setMetric] = useState<Metric>("earnings");
  const [active, setActive] = useState<number | null>(null);
  const [width, setWidth] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Track the container width so we can draw the SVG at real pixel size.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(w);
    });
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const values = useMemo(
    () => points.map((p) => (metric === "earnings" ? p.earnings : p.bookings)),
    [points, metric],
  );

  const rawMax = Math.max(...values, 0);
  const max = niceCeil(rawMax);
  const hasData = rawMax > 0;
  const n = points.length;

  const plotW = Math.max(width - PAD_L - PAD_R, 0);
  const plotH = HEIGHT - PAD_T - PAD_B;

  const coords = useMemo(
    () =>
      values.map((v, i) => {
        const x = n <= 1 ? PAD_L + plotW / 2 : PAD_L + (i / (n - 1)) * plotW;
        const y = PAD_T + plotH - (v / max) * plotH;
        return { x, y };
      }),
    [values, n, max, plotW, plotH],
  );

  const linePath = smoothPath(coords);
  const areaPath =
    coords.length > 0
      ? `${linePath} L ${coords[coords.length - 1]!.x} ${PAD_T + plotH} L ${
          coords[0]!.x
        } ${PAD_T + plotH} Z`
      : "";

  // Period-over-period delta (last bucket vs the previous one).
  const delta = useMemo(() => {
    if (values.length < 2) return null;
    const curr = values[values.length - 1]!;
    const prev = values[values.length - 2]!;
    if (prev === 0) return curr === 0 ? null : 100;
    return ((curr - prev) / prev) * 100;
  }, [values]);

  const total = values.reduce((s, v) => s + v, 0);
  const gridLevels = [0, 0.5, 1];

  const fmtValue = (v: number) =>
    metric === "earnings" ? fullINR(v) : `${v} booking${v === 1 ? "" : "s"}`;
  const fmtAxis = (v: number) =>
    metric === "earnings" ? compactINR(v) : String(Math.round(v));

  const activePt = active !== null ? coords[active] : null;
  const ready = width > 0;

  return (
    <div className="rounded-2xl border border-[#e7f1fa] bg-white p-4 shadow-[0_10px_30px_-14px_rgba(58,119,172,0.22)] sm:px-5">
      {/* Header — kept to a single tight row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-[#16304c]">
            {metric === "earnings" ? "Earnings overview" : "Bookings overview"}
          </h2>
          <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <p className="text-xl font-extrabold text-[#16304c]">
              {metric === "earnings" ? fullINR(total) : total}
            </p>
            {hasData && delta !== null && (
              <span
                className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                  delta >= 0
                    ? "bg-[#e6f7ee] text-[#1a9d63]"
                    : "bg-[#fdeaea] text-[#d2554a]"
                }`}
              >
                {delta >= 0 ? (
                  <LuTrendingUp className="h-3 w-3" />
                ) : (
                  <LuTrendingDown className="h-3 w-3" />
                )}
                {Math.abs(Math.round(delta))}%
              </span>
            )}
            <span className="text-[11px] font-medium text-[#9fb3c8]">
              last {n} mo
            </span>
          </div>
        </div>

        {/* Metric toggle */}
        <div className="inline-flex shrink-0 rounded-lg bg-[#eef5fb] p-0.5 text-[11px] font-semibold">
          {(["earnings", "bookings"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMetric(m);
                setActive(null);
              }}
              className={`rounded-md px-2.5 py-1 capitalize transition ${
                metric === m
                  ? "bg-white text-[#0e8ae0] shadow-sm"
                  : "text-[#6f8daa] hover:text-[#16304c]"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Chart — collapses to a short strip when empty */}
      <div
        ref={wrapRef}
        className="relative mt-2"
        style={{ height: hasData ? HEIGHT : EMPTY_H }}
      >
        {ready && hasData && (
          <svg
            width={width}
            height={HEIGHT}
            className="touch-none"
            role="img"
            aria-label={`${metric} trend over the last ${n} months`}
            onPointerLeave={() => setActive(null)}
          >
            <defs>
              <linearGradient id="msm-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1fa7ff" stopOpacity="0.32" />
                <stop offset="100%" stopColor="#63ceff" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="msm-line" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#0e8ae0" />
                <stop offset="100%" stopColor="#42b8ff" />
              </linearGradient>
            </defs>

            {/* Horizontal gridlines + y-axis labels */}
            {gridLevels.map((lvl) => {
              const y = PAD_T + plotH - lvl * plotH;
              return (
                <g key={lvl}>
                  <line
                    x1={PAD_L}
                    y1={y}
                    x2={width - PAD_R}
                    y2={y}
                    stroke="#eaf2f9"
                    strokeWidth={1}
                  />
                  <text
                    x={PAD_L - 8}
                    y={y + 4}
                    textAnchor="end"
                    fill="#9fb3c8"
                    style={{ fontSize: 11 }}
                  >
                    {fmtAxis(max * lvl)}
                  </text>
                </g>
              );
            })}

            {/* Area + line (only meaningful when there's data) */}
            {hasData && (
              <>
                <path d={areaPath} fill="url(#msm-area)" />
                <path
                  d={linePath}
                  fill="none"
                  stroke="url(#msm-line)"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )}

            {/* Active vertical guide + dot */}
            {activePt && (
              <>
                <line
                  x1={activePt.x}
                  y1={PAD_T}
                  x2={activePt.x}
                  y2={PAD_T + plotH}
                  stroke="#1fa7ff"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  opacity={0.5}
                />
                <circle
                  cx={activePt.x}
                  cy={activePt.y}
                  r={5.5}
                  fill="#ffffff"
                  stroke="#1fa7ff"
                  strokeWidth={3}
                />
              </>
            )}

            {/* X-axis labels */}
            {points.map((p, i) => (
              <text
                key={p.label + i}
                x={coords[i]!.x}
                y={HEIGHT - 8}
                textAnchor="middle"
                fill={active === i ? "#16304c" : "#9fb3c8"}
                style={{ fontSize: 11, fontWeight: active === i ? 700 : 500 }}
              >
                {p.label}
              </text>
            ))}

            {/* Invisible hover/tap zones — one column per bucket */}
            {points.map((p, i) => {
              const colW = plotW / Math.max(n, 1);
              const cx = coords[i]!.x;
              return (
                <rect
                  key={"hit" + i}
                  x={cx - colW / 2}
                  y={PAD_T}
                  width={colW}
                  height={plotH}
                  fill="transparent"
                  onPointerEnter={() => setActive(i)}
                  onPointerMove={() => setActive(i)}
                />
              );
            })}
          </svg>
        )}

        {/* Floating tooltip (HTML overlay, positioned in px to match the SVG). */}
        {active !== null && activePt && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl bg-[#16304c] px-2.5 py-1.5 text-center whitespace-nowrap text-white shadow-lg"
            style={{ left: activePt.x, top: activePt.y - 10 }}
          >
            <p className="text-[10px] font-medium text-white/65">
              {points[active]!.label}
            </p>
            <p className="text-xs font-bold">{fmtValue(values[active]!)}</p>
          </div>
        )}

        {/* Empty state — a slim baseline strip, not a tall grid */}
        {!hasData && (
          <div className="absolute inset-0 flex items-center gap-3">
            <span className="h-px flex-1 bg-[repeating-linear-gradient(90deg,#dfeaf4_0_6px,transparent_6px_12px)]" />
            <span className="shrink-0 text-[11px] font-medium text-[#9fb3c8]">
              No {metric} in the last {n} months yet
            </span>
            <span className="h-px flex-1 bg-[repeating-linear-gradient(90deg,#dfeaf4_0_6px,transparent_6px_12px)]" />
          </div>
        )}
      </div>
    </div>
  );
}
