interface PeopleCardProps{
    name:string;
    imageUrl:string;
    rating:string;
}
const PeopleCard=(props:PeopleCardProps)=>{
    return(
        <div className="flex-shrink-0 snap-start flex flex-col items-center justify-center rounded-2xl m-5 h-[15rem] w-[18rem] overflow-hidden">
            <div className="bg-gray-200 rounded-2xl w-full h-full overflow-hidden relative" style={{backgroundImage:`url(${props.imageUrl}),linear-gradient(180deg, rgba(0, 148, 202, 0.5) 0%, rgba(0, 148, 202, 0) 100%)`, backgroundSize:"cover", backgroundPosition:"center", backgroundRepeat:"no-repeat"}}>
                <img src="/assets/home/verified.svg" alt="Verified" className="h-[1rem] w-[1rem] absolute bottom-0 right-0" />
            </div>
            <p className="text-sm text-gray-800 mt-2">{props.name}</p>
            <div className="flex flex-row justify-center items-center w-full mt-1">
                <img src="/assets/home/star.svg" alt="Star" className="h-[1rem] w-[1rem]" />
                <p className="text-sm text-gray-800 ml-1">{props.rating}</p>
            </div>
        </div>
    );
}
export default PeopleCard;