"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { BecomeHostModal } from "~/components/become-host";
import { useListTimeAction } from "~/hooks/useListTimeAction";
import Reveal from "./about/Reveal";
import { GRADIENT } from "./shared";

const delay = (s: number) => ({ "--d": `${s}s` }) as React.CSSProperties;

/**
 * Invitation to host, used wherever the site asks visitors to share what they
 * love. Copy on the left, the host café illustration on the right.
 */
/** Approved Magnific illustrations, 1152 × 864. */
const CAFE = {
  src: "/assets/illustrations/approved/host-cafe-conversation.webp",
  alt: "A host leaning in to explain something to a laughing guest over coffee in a café at night",
};

export default function HostInvite({
  eyebrow = "For hosts",
  title,
  body,
  image = CAFE,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  body?: React.ReactNode;
  image?: { src: string; alt: string };
}) {
  const {
    closeBecomeHostModal,
    handleListTimeClick,
    hostStatus,
    showBecomeHostModal,
  } = useListTimeAction();
  // Host status comes from localStorage, so wait for mount to match the server.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="relative isolate overflow-hidden rounded-[32px] border border-[#652A91] bg-gradient-to-br from-[#241333] via-[#121426] to-[#080914]">
      <div
        aria-hidden
        className="msm-drift absolute -right-24 -bottom-24 -z-10 h-[420px] w-[520px] rounded-full bg-[#A020F0]/25 blur-[120px]"
      />
      <div className="grid items-center gap-6 px-7 pt-12 pb-6 md:grid-cols-[1.05fr_1fr] md:gap-4 md:py-10 md:pr-8 md:pl-14 lg:py-12">
        <Reveal>
          <p className="msm-r flex items-center gap-3 text-xs font-bold tracking-[0.18em] text-[#D8B4FE] uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-[#D8B4FE] shadow-[0_0_10px_#D8B4FE]" />
            {eyebrow}
          </p>
          <h2
            className="font-outfit msm-r mt-5 max-w-[560px] text-[clamp(30px,3.8vw,48px)] leading-[1.06] font-normal tracking-tight text-balance text-white"
            style={delay(0.1)}
          >
            {title}
          </h2>
          {body && (
            <p
              className="msm-r mt-4 max-w-[460px] text-base leading-relaxed text-[#A5A8C3]"
              style={delay(0.2)}
            >
              {body}
            </p>
          )}
          <div className="msm-r mt-8 flex flex-wrap gap-3" style={delay(0.3)}>
            <button
              type="button"
              onClick={handleListTimeClick}
              className={`font-outfit flex h-12 items-center gap-1.5 rounded-full px-6 text-base font-semibold text-white ${GRADIENT}`}
            >
              {mounted && hostStatus === "approved"
                ? "Create an event"
                : "Host with MySlotMate"}{" "}
              <ArrowUpRight className="h-4 w-4" />
            </button>
            <Link
              href="/host-with-us"
              className="font-outfit flex h-12 items-center rounded-full border border-white/15 px-6 text-base font-semibold text-white transition hover:bg-white/5"
            >
              How hosting works
            </Link>
          </div>
        </Reveal>
        <Reveal className="mx-auto w-full max-w-[440px] md:max-w-[480px]">
          <div className="msm-r" style={delay(0.2)}>
            {/* Approved Magnific illustration; edges fade into the card. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.src}
              alt={image.alt}
              width={1152}
              height={864}
              loading="lazy"
              className="h-auto w-full [mask-image:radial-gradient(ellipse_62%_60%_at_52%_54%,#000_55%,transparent_96%)] mix-blend-lighten"
            />
          </div>
        </Reveal>
      </div>
      <BecomeHostModal
        open={showBecomeHostModal}
        onClose={closeBecomeHostModal}
      />
    </div>
  );
}
