"use client";
import PeopleCard from "./PeopleCard";

const People=()=>{
    return(
        <div className="flex flex-col items-center justify-center gap-4 mt-8">
            <div className="flex flex-row justify-around items-center gap-4 w-screen px-[10vw]">
                <h1 className="text-xl text-left text-[#000000] font-medium">Interesting People Near You</h1>
                <button className="text-[#0094CA] text-sm flex flex-row items-center justify-center gap-2"><span>see more</span><span className="bg-[#0094CA] w-[2.5rem] h-[2.5rem] flex items-center justify-center rounded-full"><img src="/assets/home/keyboard_arrow_right.svg" alt="See More" /></span></button>
            </div>
            <div className="flex flex-row-reverse items-center justify-start w-screen gap-4 px-[10vw] overflow-x-auto overflow-y-hidden flex-nowrap snap-x snap-mandatory touch-pan-x hide-scrollbar" style={{WebkitOverflowScrolling:'touch'}}>
                <PeopleCard name="John Doe" imageUrl="/assets/home/people1.png" rating="4.5" />
                <PeopleCard name="Jane Smith" imageUrl="/assets/home/people2.png" rating="4.8" />
                <PeopleCard name="Robert Johnson" imageUrl="/assets/home/people3.png" rating="4.2" />
                <PeopleCard name="Alice Williams" imageUrl="/assets/home/people1.png" rating="4.6" />
                <PeopleCard name="Michael Brown" imageUrl="/assets/home/people2.png" rating="4.7" />
                <PeopleCard name="Emily Davis" imageUrl="/assets/home/people3.png" rating="4.4" />
                <PeopleCard name="Daniel Wilson" imageUrl="/assets/home/people1.png" rating="4.3" />
                <PeopleCard name="Olivia Martinez" imageUrl="/assets/home/people2.png" rating="4.9" />
            </div>
        </div>
    );
}

export default People;