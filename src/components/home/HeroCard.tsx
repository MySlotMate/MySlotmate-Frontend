"use client";

import Link from "next/link";

interface CardProps {
  photo: string;
  type: string;
  title: string;
  description: string;
  duration: string;
  id?: string;
  /** Clean slug for the link; falls back to id (both resolve). */
  slug?: string;
}

const HeroCard = ({
  photo,
  type,
  title,
  description,
  duration,
  id,
  slug,
}: CardProps) => {
  const ref = slug ?? id;
  const href = ref ? `/experience/${ref}` : "/experiences";

  return (
    <Link
      href={href}
      className="block w-[236px] cursor-pointer rounded-3xl border border-[#aeddf899] bg-white/94 p-[14px] shadow-[0_20px_42px_rgba(60,121,175,0.14)] transition hover:-translate-y-1 hover:shadow-[0_26px_54px_rgba(60,121,175,0.18)] focus:ring-2 focus:ring-[#1fa7ff]/40 focus:outline-none sm:w-[264px] md:w-[300px]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo}
        alt={title}
        loading="lazy"
        className="h-[164px] w-full rounded-2xl object-cover"
      />

      <div className="mt-3 space-y-2">
        <span className="inline-flex rounded-full bg-[#dff3ff] px-2.5 py-1 text-[0.68rem] font-extrabold tracking-[0.08em] text-[#0e8ae0] uppercase">
          {type}
        </span>

        <h3 className="line-clamp-1 text-[1rem] font-bold text-[#16304c]">
          {title}
        </h3>
        <p className="line-clamp-2 text-[0.83rem] leading-[1.55] text-[#6f8daa]">
          {description}
        </p>

        <div className="flex items-center pt-1 text-xs">
          <span className="rounded-full bg-[#f1f8ff] px-2.5 py-1 font-semibold text-[#3f7eb1]">
            {duration}
          </span>
        </div>
      </div>
    </Link>
  );
};

export default HeroCard;
