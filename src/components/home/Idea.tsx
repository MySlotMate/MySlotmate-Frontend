const Idea=()=>{
    return(
        <div className="flex flex-col items-center justify-center rounded-2xl w-full lg:w-[80vw] p-8" style={{background: "linear-gradient(180deg, rgba(0, 148, 202, 0.1) 0%, rgba(255, 255, 255, 0.1) 100.13%)",border: "1.63px solid #0094CA33"}}>
            <div className="flex flex-col items-center justify-center text-center">
                <h1 className="text-2xl font-bold">The <span className="text-[#0094CA]">Idea</span> Behind MySlotmate</h1>
                <p className="text-[#6B7280] text-md">Book time with interesting people</p>
            </div>
            <div className="flex flex-col md:flex-row items-center justify-around text-center">
                <div className="flex flex-col items-center justify-center">
                    <div className="flex items-center justify-center h-[4rem] w-[4rem] bg-[#0094CA1A] rounded-full p-2">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/assets/home/real.svg" alt="Real People" /></div>
                    <h1 className="text-lg font-semibold">Real People</h1>
                    <p className="text-[#6B7280]">Our community is vetted to ensure safety and authenticity for every experience</p>
                </div>
                <div className="flex flex-col items-center justify-center">
                    <div className="flex items-center justify-center h-[4rem] w-[4rem] bg-[#0094CA1A] rounded-full p-2">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/assets/home/icon.svg" alt="Right Fit" /></div>   
                    <h1 className="text-lg font-semibold">Right Fit</h1>
                    <p className="text-[#6B7280]">Don&apos;t just book a slot, book a moment. Find what feels right for you today.</p>
                </div>
                <div className="flex flex-col items-center justify-center">
                    <div className="flex items-center justify-center h-[4rem] w-[4rem] bg-[#0094CA1A] rounded-full p-2">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/assets/home/spark.svg" alt="Book Now" /></div>
                    <h1>Book Now</h1>
                    <p className="text-[#6B7280]">Secure your slot in seconds with our seamless and secure checkout process.</p>
                </div>
            </div>
        </div>
    );
}

export default Idea;