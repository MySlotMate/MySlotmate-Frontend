"use client";
import { BecomeHostModal } from "~/components/become-host";
import { useListTimeAction } from "~/hooks/useListTimeAction";

const Idea = () => {
  const { closeBecomeHostModal, handleListTimeClick, showBecomeHostModal } =
    useListTimeAction();

  return (
    <section className="site-x w-full">
      <div className="mx-auto grid w-full max-w-[1120px] gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-[26px] bg-[linear-gradient(135deg,#109ae9,#0d85db)] p-7 text-white shadow-[0_22px_48px_rgba(18,132,214,0.22)]">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/20 px-3.5 py-2 text-[11px] font-extrabold tracking-[0.08em] uppercase">
            List your time
          </span>
          <h3 className="mt-4 font-[Outfit,sans-serif] text-3xl leading-tight font-bold tracking-[-0.04em] sm:text-4xl">
            Turn Your Passion Into Experiences
          </h3>
          <p className="mt-4 max-w-[420px] text-sm leading-7 text-white/85">
            Share workshops, walks, food stories, or creative sessions and grow
            your local community while earning per slot.
          </p>

          <ul className="mt-5 space-y-2 text-sm text-white/90">
            <li>Host meaningful experiences</li>
            <li>Earn with each session</li>
            <li>Build your local community</li>
          </ul>

          <button
            onClick={handleListTimeClick}
            className="mt-6 rounded-full border border-white/30 bg-white/15 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/25"
          >
            Become a Host
          </button>
        </article>

        <article className="rounded-3xl border border-[#aeddf89e] bg-white p-5 shadow-[0_14px_32px_rgba(77,140,190,0.08)]">
          <h3 className="text-base font-bold text-[#16304c]">
            The Idea Behind MySlotMate
          </h3>
          <p className="mt-1 text-sm text-[#6f8daa]">
            Explore experiences with interesting people near you.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              {
                title: "Real People",
                copy: "Vetted community for safety and authenticity.",
                icon: "/assets/home/real.svg",
              },
              {
                title: "Right Fit",
                copy: "Find moments aligned to your mood and energy.",
                icon: "/assets/home/Icon.svg",
              },
              {
                title: "Book Fast",
                copy: "Secure your slot in seconds with smooth checkout.",
                icon: "/assets/home/spark.svg",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl bg-[#f7fcff] p-4 text-center"
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#0094CA1A]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.icon}
                    alt={item.title}
                    loading="lazy"
                    className="h-5 w-5"
                  />
                </div>
                <h4 className="mt-2 text-sm font-bold text-[#16304c]">
                  {item.title}
                </h4>
                <p className="mt-1 text-xs leading-5 text-[#6f8daa]">
                  {item.copy}
                </p>
              </div>
            ))}
          </div>
        </article>
      </div>
      <BecomeHostModal
        open={showBecomeHostModal}
        onClose={closeBecomeHostModal}
      />
    </section>
  );
};

export default Idea;
