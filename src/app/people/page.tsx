import Link from 'next/link';
import PeopleCard from '../../components/home/PeopleCard';
import peopleData from '../../data/People.json';

type Person = {
  id: number;
  name: string;
  imageUrl: string;
  rating: string;
  location?: string;
}

export const metadata = {
  title: 'Interesting People',
};

export default function PeoplePage() {
  const people = Array.isArray(peopleData) ? (peopleData as Person[]) : [];

  return (
    <main className="min-h-screen px-[10vw] py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Interesting People</h1>
        <Link href="/" className="text-[#0094CA]">Back to Home</Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {people.map((p: Person) => (
          <PeopleCard key={p.id} name={p.name} imageUrl={p.imageUrl} rating={p.rating} />
        ))}
      </div>
    </main>
  );
}
