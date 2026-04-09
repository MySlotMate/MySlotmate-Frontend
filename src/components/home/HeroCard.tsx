"use client";

interface CardProps {
  photo: string;
  type: string;
  title: string;
  description: string;
  duration: string;
  id?: string;
}

const HeroCard = ({ photo, type, title, description, duration }: CardProps) => {
  return (
    <article className="w-[236px] rounded-3xl border border-sky-100 bg-white p-3 shadow-[0_20px_44px_rgba(60,121,175,0.14)] sm:w-[264px] md:w-[282px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo}
        alt={title}
        className="h-36 w-full rounded-2xl object-cover sm:h-40"
      />

      <div className="mt-3 space-y-2">
        <span className="inline-flex rounded-full bg-[#dff3ff] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#0e8ae0]">
          {type}
        </span>

        <h3 className="line-clamp-1 text-sm font-bold text-[#16304c]">{title}</h3>
        <p className="line-clamp-2 text-xs leading-5 text-[#6f8daa]">{description}</p>

        <div className="flex items-center justify-between pt-1 text-xs">
          <span className="rounded-full bg-[#f1f8ff] px-2.5 py-1 font-semibold text-[#3f7eb1]">
            {duration}
          </span>
          <span className="font-bold text-[#0e8ae0]">Book</span>
        </div>
      </div>
    </article>
  );
};

export default HeroCard;
