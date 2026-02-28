interface CardProps{
    photo:string;
    type:string;
    title:string;
    description:string;
    duration:string;
}
const HeroCard=({photo,type,title,description,duration}:CardProps)=>{
    const truncatedDescription = typeof description === 'string' && description.length > 20
        ? description.slice(0, 20) + '...'
        : description;
    return(
        <>
            <div className="flex flex-row rounded-2xl w-[18rem] h-[8rem] bg-[#ffffff] shadow-lg mt-4">
                <img src={photo} alt={title} className="object-cover rounded-l-2xl" />
                <div className="flex flex-col items-start justify-center p-2">
                    <h1 className="text-xs font-bold text-[#6A9955] uppercase">{type}</h1>
                    <h1 className="text-sm font-semibold">{title}</h1>
                    <p className="text-xs text-[#6B7280]">{truncatedDescription}</p>
                    <div className="flex flex-row justify-between w-full text-xs">
                        <span className="bg-[#F3F4F6] text-[#374151] p-0.5 rounded-[6px]">{duration}</span>
                        <button className="text-[#127D87]">View Details</button>
                    </div>
                </div>
            </div>
        </>
    );
}
export default HeroCard;