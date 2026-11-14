"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BecomeHostModal } from "~/components/become-host";
import { useListTimeAction } from "~/hooks/useListTimeAction";
import { GRADIENT } from "./shared";

/** "Didn't find it? Host it." band, after the slot grid. */
export default function HostBand() {
  const { closeBecomeHostModal, handleListTimeClick, showBecomeHostModal } =
    useListTimeAction();

  return (
    <section className="mx-auto w-full max-w-[1280px] px-5 py-10 md:px-10">
      <div className="relative isolate overflow-hidden rounded-[36px] border border-white/10 bg-[#121426] px-7 py-14 md:px-16 md:py-20">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 [background-image:radial-gradient(rgb(248_247_255/0.07)_1px,transparent_1px)] [mask-image:linear-gradient(90deg,transparent_35%,#000_70%)] [background-size:28px_28px] opacity-60"
        />
        <div
          aria-hidden
          className="msm-drift pointer-events-none absolute -top-10 -right-20 -z-10 h-[420px] w-[560px] rounded-full bg-[#A020F0]/35 blur-[120px]"
        />
        <span className="inline-flex rounded-full border border-white/10 bg-[#1B1D33] px-3 py-1.5 text-[13px] font-semibold text-[#A5A8C3]">
          Didn’t find what you were looking for?
        </span>
        <h2 className="font-outfit mt-5 max-w-[560px] text-[clamp(36px,5vw,56px)] leading-[1.06] font-bold tracking-tight text-white">
          Host the slot you wish existed.
        </h2>
        <p className="mt-4 max-w-[460px] text-base leading-relaxed text-[#A5A8C3]">
          Run a community, a workshop or a one-on-one session. Set your own time
          and price, and let people near you book it.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleListTimeClick}
            className={`font-outfit flex h-12 items-center gap-1.5 rounded-full px-6 text-base font-semibold text-white ${GRADIENT}`}
          >
            Host with MySlotMate <ArrowUpRight className="h-4 w-4" />
          </button>
          <Link
            href="/become-host"
            className="font-outfit flex h-12 items-center rounded-full border border-white/10 px-6 text-base font-semibold text-white transition hover:bg-white/5"
          >
            How hosting works
          </Link>
        </div>
      </div>
      <BecomeHostModal
        open={showBecomeHostModal}
        onClose={closeBecomeHostModal}
      />
    </section>
  );
}
