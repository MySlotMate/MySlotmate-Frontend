"use client";
interface TrendingCardProps{
    title:string;
    imageUrl:string;
    pricing:string;
}

const Trending=()=>{
    return(
        <div className="flex flex-col items-center justify-center">
            <div className="flex flex-row items-center justify-around">
                <h1 className="text-xl text-left text-[#000000] font-medium">Trending Activities</h1>
                <button className="text-[#0094CA] text-sm">see more</button>
            </div>
            <div className="flex flex-row justify-around items-center overflow-auto w-full">

            </div>
        </div>
    );
}
export default Trending;