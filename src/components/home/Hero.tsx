import React from "react";
import HeroCard from "./HeroCard";
const Hero: React.FC = () => {
    return (
        <div className="py-[5rem] px-[8rem] w-full justify-around gap-[3rem] items-center flex flex-col lg:flex-row text-[#000000]">
            <div className="flex flex-col scale-100 lg:scale-150">
                <h1 className="text-2xl font-bold text-center md:text-left">Book People's<br /><span className="text-[#0094CA]">Time.</span></h1>
                <p className="text-sm text-center text-[#606060] md:text-left mb-4">Pick an interest. Meet someone who shares it.</p>
                <div className="flex flex-row gap-0.5 justify-center text-semibold">
                    <button className="w-[45%] h-[1.2rem] bg-[#0094CA] text-[#ffffff] text-xs rounded-md mt-2">Book Time</button>
                    <button className="w-[45%] h-[1.2rem] bg-[#ffffff] text-[#231F20] border border-[#BBBBBB] rounded-md mt-2 text-xs">List Time</button>
                </div>
                <div className="flex flex-row justify-center items-center md:justify-start mt-2">
                    <div className="h-[1.5rem] w-[1.5rem] rounded-full bg-[#EEEEEE] border border-[#ffffff] z-0"><img className="rounded-full" src="/assets/home/profile1.png"/></div>
                    <div className="h-[1.5rem] w-[1.5rem] rounded-full bg-[#EEEEEE] border border-[#ffffff] -translate-x-2 z-10"><img className="rounded-full" src="/assets/home/profile2.png"/></div>
                    <div className="h-[1.5rem] w-[1.5rem] rounded-full bg-[#EEEEEE] border border-[#ffffff] -translate-x-4 z-20"><img className="rounded-full" src="/assets/home/profile3.png"/></div>
                    <div className="h-[1.5rem] w-[1.5rem] rounded-full bg-[#EEEEEE] border border-[#ffffff] -translate-x-6 z-30 text-[#000000] text-[0.5rem] text-center p-1 flex items-center justify-center"><span>+10K</span></div>
                    <p className="text-[0.5rem] text-[#8E8E8E] ml-2">Used by interesting people</p>
                </div>
            </div>
            <div className='flex flex-col items-center justify-center'>
                <div className="lg:translate-x-[10rem] lg:translate-y-[1rem]">
                    <HeroCard
                        photo="/assets/home/heropic1.png"
                        type="Adventure"
                        title="Mountain Trekking"
                        description="Explore the breathtaking mountain trails with our expert guides."
                        duration="2 days"
                    />
                </div>
                <HeroCard
                    photo="/assets/home/heropic2.png"
                    type="Adventure"
                    title="Scuba Diving"
                    description="Dive into the vibrant underwater world with our certified instructors."
                    duration="1 day"
                />
                <div className="lg:translate-x-[10rem] lg:translate-y-[-1rem]">
                    <HeroCard
                        photo="/assets/home/heropic3.png"
                        type="Chill"
                        title="Urban Photography Walk"
                        description="Capture the essence of the city with our expert photography guides."
                        duration="4 hours"
                    />
                </div>
            </div>
        </div>
    );
}

export default Hero;