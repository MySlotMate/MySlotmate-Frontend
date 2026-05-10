interface PeopleCardProps {
  name: string;
  imageUrl: string;
  rating: string;
}
const PeopleCard = (props: PeopleCardProps) => {
  return (
    <div className="m-5 flex h-[15rem] w-[18rem] flex-shrink-0 snap-start flex-col items-center justify-center overflow-hidden rounded-2xl">
      <div
        className="relative h-full w-full overflow-hidden rounded-2xl bg-gray-200 transition-transform duration-300 hover:scale-110"
        style={{
          backgroundImage: `url(${props.imageUrl}),linear-gradient(180deg, rgba(0, 148, 202, 0.5) 0%, rgba(0, 148, 202, 0) 100%)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <img
          src="/assets/home/verified.svg"
          alt="Verified"
          loading="lazy"
          className="absolute right-0 bottom-0 h-[1rem] w-[1rem]"
        />
      </div>
      <p className="mt-2 text-sm text-gray-800">{props.name}</p>
      <div className="mt-1 flex w-full flex-row items-center justify-center">
        <img
          src="/assets/home/star.svg"
          alt="Star"
          loading="lazy"
          className="h-[1rem] w-[1rem]"
        />
        <p className="ml-1 text-sm text-gray-800">{props.rating}</p>
      </div>
    </div>
  );
};
export default PeopleCard;
