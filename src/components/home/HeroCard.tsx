"use client";

import { useRouter } from "next/navigation";

interface CardProps {
  photo: string;
  type: string;
  title: string;
  description: string;
  duration: string;
  id?: string;
}

const HeroCard = ({ photo, type, title, description, duration, id }: CardProps) => {
  const router = useRouter();

  const goToExperience = () => {
    if (id) {
      router.push(`/experience/${id}`);
      return;
    }

    router.push("/experiences");
  };

  return (
    <article
      className="w-[236px] cursor-pointer rounded-3xl border border-sky-100 bg-white p-3 shadow-[0_20px_44px_rgba(60,121,175,0.14)] transition hover:-translate-y-1 hover:shadow-[0_26px_54px_rgba(60,121,175,0.18)] focus:outline-none focus:ring-2 focus:ring-[#1fa7ff]/40 sm:w-[264px] md:w-[282px]"
      role="link"
      tabIndex={0}
      onClick={goToExperience}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          goToExperience();
        }
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo}
        alt={title}
        loading="lazy"
        className="h-36 w-full rounded-2xl object-cover sm:h-40"
      />

      <div className="mt-3 space-y-2">
        <span className="inline-flex rounded-full bg-[#dff3ff] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#0e8ae0]">
          {type}
        </span>

        <h3 className="line-clamp-1 text-sm font-bold text-[#16304c]">{title}</h3>
        <p className="line-clamp-2 text-xs leading-5 text-[#6f8daa]">{description}</p>

        <div className="flex items-center pt-1 text-xs">
          <span className="rounded-full bg-[#f1f8ff] px-2.5 py-1 font-semibold text-[#3f7eb1]">
            {duration}
          </span>
        </div>
      </div>
    </article>
  );
};

export default HeroCard;

