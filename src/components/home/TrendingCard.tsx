"use client";
interface TrendingCardProps {
  title: string;
  imageUrl: string;
  pricing: string;
}

const TrendingCard = ({ title, imageUrl, pricing }: TrendingCardProps) => {
  return (
    <div className="flex h-[24rem] w-[20rem] flex-shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-lg p-4 shadow-olive-800">
      <img
        src={imageUrl}
        alt={title}
        loading="lazy"
        className="h-[90%] w-full rounded-2xl object-cover"
      />
      <h2 className="text-sm font-medium text-[#000000]">{title}</h2>
      <p className="text-xs text-[#0094CA]">{pricing}</p>
    </div>
  );
};

export default TrendingCard;
