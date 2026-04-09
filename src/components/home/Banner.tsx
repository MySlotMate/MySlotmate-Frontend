"use client";
import { useRouter } from "next/navigation";

const Banner = () => {
  const router = useRouter();

  return (
    <section className="w-full site-x">
      <div className="mx-auto grid w-full max-w-[1120px] gap-6 rounded-[28px] border border-[#aeddf885] bg-white p-4 shadow-[0_18px_42px_rgba(60,121,175,0.10)] md:grid-cols-[1.02fr_0.98fr] md:items-center md:p-5">
        <div className="relative mx-auto w-full max-w-[360px] overflow-hidden rounded-3xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/home/cover.svg" alt="Featured experience" className="h-full w-full object-cover" />
          <div className="absolute bottom-4 left-4 rounded-2xl bg-[#12334fc2] px-3 py-2 text-white backdrop-blur-sm">
            <p className="text-sm font-semibold">Featured Hosts</p>
            <p className="text-xs text-white/80">Stories, workshops, and city walks</p>
          </div>
        </div>

        <div className="space-y-4 md:pr-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#a9daf5a6] bg-[#f5fbff] px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#4a8ab8]">
            Featured Experience
          </span>
          <h3 className="font-[Outfit,sans-serif] text-3xl font-bold tracking-[-0.04em] text-[#16304c] sm:text-4xl">
            Discover Local Moments
            <br className="hidden sm:block" />
            With Trusted Hosts
          </h3>
          <p className="text-sm leading-7 text-[#6f8daa]">
            Explore curated activities around you and instantly book the ones that match your mood, schedule, and interests.
          </p>

          <div className="flex flex-wrap gap-2">
            {[
              "Handpicked experiences",
              "Verified hosts",
              "Flexible booking",
            ].map((item) => (
              <span key={item} className="rounded-full bg-[#dff3ff] px-3 py-2 text-xs font-bold text-[#3f7eb1]">
                {item}
              </span>
            ))}
          </div>

          <button
            onClick={() => router.push("/experiences")}
            className="rounded-full bg-[linear-gradient(135deg,#1fa7ff,#63ceff)] px-6 py-3 text-sm font-extrabold text-white shadow-[0_16px_32px_rgba(31,167,255,0.24)] transition hover:-translate-y-0.5"
          >
            Book This Experience
          </button>
        </div>
      </div>
    </section>
  );
};

export default Banner;
