import React from "react";
import HeroCard from "./HeroCard";
const Hero: React.FC = () => {
    return (
        <div className="flex flex-col md:flex-row text-[#000000]">
            <div className="flex flex-col">
                <h1 className="text-2xl font-bold text-center md:text-left">Book People's<br /><span className="text-[#0094CA]">Time.</span></h1>
                <p className="text-sm text-center text-[#606060] md:text-left mb-4">Pick an interest. Meet someone who shares it.</p>
                <div className="flex flex-row gap-0.5 justify-center text-semibold">
                    <button className="w-[45%] h-[1.2rem] bg-[#0094CA] text-[#ffffff] text-xs rounded-md mt-2">Book Time</button>
                    <button className="w-[45%] h-[1.2rem] bg-[#ffffff] text-[#231F20] border border-[#BBBBBB] rounded-md mt-2 text-xs">List Time</button>
                </div>
            </div>
            <div className='flex flex-col items-center justify-center'>
                <HeroCard
                    photo="/assets/home/heropic1.png"
                    type="Adventure"
                    title="Mountain Trekking"
                    description="Explore the breathtaking mountain trails with our expert guides."
                    duration="2 days"
                />
                <HeroCard
                    photo="/assets/home/heropic2.png"
                    type="Adventure"
                    title="Scuba Diving"
                    description="Dive into the vibrant underwater world with our certified instructors."
                    duration="1 day"
                />
                <HeroCard
                    photo="/assets/home/heropic3.png"
                    type="Chill"
                    title="Urban Photography Walk"
                    description="Capture the essence of the city with our expert photography guides."
                    duration="4 hours"
                />
            </div>
        </div>
    );
}

export default Hero;