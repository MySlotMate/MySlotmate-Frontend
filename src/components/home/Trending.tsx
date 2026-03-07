"use client";
import TrendingCard from "./TrendingCard";
const Trending=()=>{
    return(
        <div className="flex flex-col items-center justify-center w-full mt-20 gap-4">
            <div className="flex flex-row items-center justify-around w-full px-4">
                <h1 className="text-xl text-left text-[#000000] font-medium">Trending Activities</h1>
                <button className="text-[#0094CA] text-sm">see more</button>
            </div>
            <div className="flex flex-row justify-center items-center w-full gap-4 overflow-x-auto overflow-y-hidden flex-nowrap snap-x snap-mandatory">
                <TrendingCard title="Hiking" imageUrl="/assets/home/hiking.jpg" pricing="$50"/>
                <TrendingCard title="Dining" imageUrl="/assets/home/dining.png" pricing="$30"/>
                <TrendingCard title="An Evening of Jazz" imageUrl="/assets/home/jazz.png" pricing="$40"/>
                <TrendingCard title="Pottery" imageUrl="/assets/home/pottery.png" pricing="$35"/>
            </div>
        </div>
    );
}
export default Trending;