const Banner = () => {
    return (
        <section className="w-full bg-[#bdedff80] md:w-[80%] lg:w-[60%] rounded-2xl border-[1px] border-[#0094CA] py-8 px-4 sm:px-6 lg:px-12 text-[#000000]">
            <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
                <div className="w-full lg:w-1/2 flex items-center justify-center">{/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/assets/home/cover.svg"
                        alt="Banner"
                        className="w-full h-auto object-contain"
                    />
                </div>

                <div className="flex flex-col md:flex-row items-center justify-center">
                    <div className="flex flex-col justify-center items-center text-2xl font-semibold gap-4">
                        <h1 className="text-center">Earn with <br/> <span className="text-[#0094CA]">MySlotMate</span></h1>
                        <button className="bg-[#0094CA] text-[#ffffff] py-2 px-4 rounded-md">List Your Time</button>
                    </div>
                    <div className="flex flex-col items-start justify-center font-semibold text-sm gap-2 mt-4 md:mt-0 md:ml-8">
                        <h1 className="flex flex-row items-center justify-center">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/assets/home/celebration.svg" alt="Check" className="h-[1rem] w-[1rem] mr-2" /><span>Host Meaningful experiences</span></h1>
                        <h1 className="flex flex-row items-center justify-center">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/assets/home/payments.svg" alt="Check" className="h-[1rem] w-[1rem] mr-2" /><span>Earn Per slot</span></h1>
                        <h1 className="flex flex-row items-center justify-center">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/assets/home/group_add.svg" alt="Check" className="h-[1rem] w-[1rem] mr-2" /><span>Build your local community</span></h1>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Banner;