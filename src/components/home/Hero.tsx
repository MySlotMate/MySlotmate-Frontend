import React, { useRef } from "react";
import HeroCard from "./HeroCard";

const Hero: React.FC = () => {
    const heroRef = useRef<HTMLDivElement>(null);


    return (
        <div 
            ref={heroRef}
            className="relative w-full overflow-hidden"
        >

            {/* Content Layer */}
            <div className="relative z-10 py-[5rem] site-x w-full justify-around gap-[3rem] items-center flex flex-col lg:flex-row text-[#000000]">
                <div className="flex flex-col scale-100 lg:scale-150">
                    <h1 className="text-2xl font-bold text-center lg:text-left">
                        Book People&apos;s<br />
                        <span className="text-[#0094CA]">Time.</span>
                    </h1>
                    <p className="text-sm text-center text-[#606060] lg:text-left mb-4">
                        Pick an interest. Meet someone who shares it.
                    </p>
                    <div className="flex flex-row gap-6 justify-start items-center text-semibold">
                        <button className="w-[45%] lg:w-auto lg:px-6 bg-[#0094CA] text-[#ffffff] text-sm rounded-md mt-2 p-2">Book Time</button>
                        <button className="w-[45%] lg:w-auto lg:px-6 bg-[#ffffff] text-[#231F20] border border-[#BBBBBB] rounded-md mt-2 text-sm p-2">List Time</button>
                    </div>
                    
                    <div className="flex flex-row justify-center items-center lg:justify-start mt-4">
                        <div className="flex -space-x-2">
                            <div className="h-[1.5rem] w-[1.5rem] rounded-full bg-[#EEEEEE] border border-[#ffffff]"><img className="rounded-full" src="/assets/home/profile1.png" alt="P1"/></div>
                            <div className="h-[1.5rem] w-[1.5rem] rounded-full bg-[#EEEEEE] border border-[#ffffff]"><img className="rounded-full" src="/assets/home/profile2.png" alt="P2"/></div>
                            <div className="h-[1.5rem] w-[1.5rem] rounded-full bg-[#EEEEEE] border border-[#ffffff]"><img className="rounded-full" src="/assets/home/profile3.png" alt="P3"/></div>
                            <div className="h-[1.5rem] w-[1.5rem] rounded-full bg-[#EEEEEE] border border-[#ffffff] text-[#000000] text-[0.5rem] flex items-center justify-center"><span>+10K</span></div>
                        </div>
                        <p className="text-[0.5rem] text-[#8E8E8E] ml-2">Used by interesting people</p>
                    </div>
                </div>

                <div className='group relative isolate flex flex-col items-center justify-center gap-4 lg:gap-0'>
                    <div
                        className="pointer-events-none absolute inset-[-8rem] -z-0"
                        style={{
                            backgroundImage:
                                "radial-gradient(circle at center, #44000011 0%, rgba(68, 0, 0, 0.05) 34%, rgba(68, 0, 0, 0) 82%), linear-gradient(to right, rgba(255, 255, 255, 0.62) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.62) 1px, transparent 1px)",
                            backgroundSize: "100% 100%, 26px 26px, 26px 26px",
                            backgroundPosition: "center, center, center",
                            maskImage: "radial-gradient(circle at center, rgba(0, 0, 0, 0.95) 14%, rgba(0, 0, 0, 0.55) 52%, rgba(0, 0, 0, 0.2) 72%, rgba(0, 0, 0, 0) 100%)",
                            WebkitMaskImage: "radial-gradient(circle at center, rgba(0, 0, 0, 0.95) 14%, rgba(0, 0, 0, 0.55) 52%, rgba(0, 0, 0, 0.2) 72%, rgba(0, 0, 0, 0) 100%)",
                        }}
                    />
                    <div className="relative z-10 origin-bottom-right transition-transform duration-500 ease-out lg:translate-x-[10rem] lg:translate-y-[1rem] lg:group-hover:rotate-[7deg]">
                        <HeroCard photo="/assets/home/heropic1.png" type="Adventure" title="Mountain Trekking" description="..." duration="2 days" />
                    </div>
                    <div className="relative z-10 origin-center transition-transform duration-500 ease-out lg:group-hover:-rotate-[7deg]">
                        <HeroCard photo="/assets/home/heropic2.png" type="Adventure" title="Scuba Diving" description="..." duration="1 day" />
                    </div>
                    <div className="relative z-10 origin-top-left transition-transform duration-500 ease-out lg:translate-x-[10rem] lg:translate-y-[-1rem] lg:group-hover:rotate-[7deg]">
                        <HeroCard photo="/assets/home/heropic3.png" type="Chill" title="Urban Photography Walk" description="..." duration="4 hours" />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Hero;
