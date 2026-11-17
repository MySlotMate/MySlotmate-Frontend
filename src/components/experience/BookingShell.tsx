"use client";

import Link from "next/link";
import { FiCheck, FiChevronLeft } from "react-icons/fi";

/** Two-step checkout header: Tickets → Payment. */
export function BookingSteps({
  step,
  ticketsHref,
}: {
  step: 1 | 2;
  /** Lets the guest go back to step 1 from the payment step. */
  ticketsHref?: string;
}) {
  const dot = (n: 1 | 2) =>
    `flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${
      n <= step
        ? "bg-[#7B2FFF] text-white"
        : "border border-white/25 text-white/55"
    }`;
  const one = (
    <>
      <span className={dot(1)}>
        {step > 1 ? <FiCheck className="h-3.5 w-3.5" /> : 1}
      </span>
      <span className={step === 1 ? "text-white" : "text-white/55"}>
        Tickets
      </span>
    </>
  );
  return (
    <ol className="flex items-center gap-3 text-[15px] font-semibold">
      <li>
        {step > 1 && ticketsHref ? (
          <Link
            href={ticketsHref}
            className="flex items-center gap-2.5 transition hover:opacity-80"
          >
            {one}
          </Link>
        ) : (
          <span className="flex items-center gap-2.5">{one}</span>
        )}
      </li>
      <li aria-hidden className="h-px w-12 bg-white/20" />
      <li className="flex items-center gap-2.5">
        <span className={dot(2)}>2</span>
        <span className={step === 2 ? "text-white" : "text-white/55"}>
          Payment
        </span>
      </li>
    </ol>
  );
}

/**
 * Checkout layout shared by the tickets and payment steps: the event poster
 * on the left (sticky on desktop), the step's content on the right.
 */
export default function BookingShell({
  poster,
  title,
  backHref,
  onBack,
  step,
  ticketsHref,
  children,
}: {
  poster: string | null | undefined;
  title: string;
  backHref?: string;
  onBack?: () => void;
  step: 1 | 2;
  ticketsHref?: string;
  children: React.ReactNode;
}) {
  const backCls =
    "flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:bg-white/10";
  const back = backHref ? (
    <Link href={backHref} aria-label="Back" className={backCls}>
      <FiChevronLeft className="h-6 w-6" />
    </Link>
  ) : (
    <button
      type="button"
      aria-label="Back"
      onClick={onBack}
      className={backCls}
    >
      <FiChevronLeft className="h-6 w-6" />
    </button>
  );

  return (
    <div className="mx-auto w-full max-w-[1080px] px-5 pt-4 pb-8 md:px-8 md:pt-8">
      <div className="mb-4 -ml-2">{back}</div>
      <div className="grid gap-8 lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-16">
        {/* Poster: a small card on phones, the full 4:5 poster on desktop */}
        <div className="lg:sticky lg:top-8 lg:self-start">
          <div className="flex items-center gap-4 lg:block">
            <div className="relative aspect-[4/5] w-20 shrink-0 overflow-hidden rounded-2xl bg-[#121426] ring-1 ring-white/10 lg:w-full lg:rounded-[28px]">
              {poster && (
                <>
                  {/* Flyers vary in ratio: blurred fill behind, uncropped on top. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={poster}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl"
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={poster}
                    alt={title}
                    className="relative h-full w-full object-contain"
                  />
                </>
              )}
            </div>
            <p className="font-outfit line-clamp-3 text-[17px] leading-snug font-medium text-white lg:hidden">
              {title}
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-col">
          <BookingSteps step={step} ticketsHref={ticketsHref} />
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** White pill that stays in view at the bottom of the step's column. */
export function StickyAction({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 z-30 -mx-1 mt-10 bg-gradient-to-t from-[#080914] via-[#080914]/90 to-transparent px-1 pt-6 pb-[max(20px,env(safe-area-inset-bottom))]">
      {children}
    </div>
  );
}

export const WHITE_PILL =
  "font-outfit flex h-14 w-full items-center justify-center gap-2 rounded-full bg-white px-6 text-[17px] font-semibold text-[#080914] shadow-[0_20px_60px_-10px_rgb(0_0_0/0.8)] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/50 disabled:shadow-none";
