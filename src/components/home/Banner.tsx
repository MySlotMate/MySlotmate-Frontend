"use client";
import Link from "next/link";

const Banner = () => {
  return (
    <section className="site-x w-full">
      <div className="mx-auto grid w-full max-w-[1120px] gap-6 rounded-[28px] border border-white/10 bg-[#121426] p-4 shadow-[0_18px_42px_rgba(60,121,175,0.10)] md:grid-cols-[1.02fr_0.98fr] md:items-center md:p-5">
        <div className="relative mx-auto w-full max-w-[360px] overflow-hidden rounded-3xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/home/cover.webp"
            alt="Featured experience"
            loading="lazy"
            className="h-full w-full object-cover"
          />
          <div className="absolute bottom-4 left-4 rounded-2xl bg-[#12334fc2] px-3 py-2 text-white backdrop-blur-sm">
            <p className="text-sm font-semibold">Featured Hosts</p>
            <p className="text-xs text-white/80">
              Stories, workshops, and city walks
            </p>
          </div>
        </div>

        <div className="space-y-4 md:pr-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-[11px] font-extrabold tracking-[0.08em] text-[#4a8ab8] uppercase">
            Featured Experience
          </span>
          <h3 className="font-[Outfit,sans-serif] text-3xl font-bold tracking-[-0.04em] text-white sm:text-4xl">
            Discover Local Moments
            <br className="hidden sm:block" />
            With Trusted Hosts
          </h3>
          <p className="text-sm leading-7 text-[#A5A8C3]">
            Explore curated activities around you and instantly book the ones
            that match your mood, schedule, and interests.
          </p>

          <div className="flex flex-wrap gap-2">
            {[
              "Handpicked experiences",
              "Verified hosts",
              "Flexible booking",
            ].map((item) => (
              <span
                key={item}
                className="rounded-full bg-white/[0.04] px-3 py-2 text-xs font-bold text-[#3f7eb1]"
              >
                {item}
              </span>
            ))}
          </div>

          <Link
            href="/experiences"
            className="inline-block rounded-full bg-[linear-gradient(135deg,#7B2FFF,#A020F0)] px-6 py-3 text-sm font-extrabold text-white shadow-[0_16px_32px_rgba(31,167,255,0.24)] transition hover:-translate-y-0.5"
          >
            Book This Experience
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Banner;
