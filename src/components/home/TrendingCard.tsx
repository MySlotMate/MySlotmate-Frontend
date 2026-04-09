"use client";
interface TrendingCardProps{
    title:string;
    imageUrl:string;
    pricing:string;
}

const TrendingCard=({title,imageUrl,pricing}:TrendingCardProps)=>{
    return(
        <div className="w-[20rem] h-[24rem] flex-shrink-0 flex flex-col items-center justify-center gap-2 p-4 rounded-lg shadow-olive-800 snap-start">
            <img src={imageUrl} alt={title} className="w-full h-[90%] rounded-2xl object-cover"/>
            <h2 className="text-sm font-medium text-[#000000]">{title}</h2>
            <p className="text-xs text-[#0094CA]">{pricing}</p>
        </div>
    );
}

export default TrendingCard;