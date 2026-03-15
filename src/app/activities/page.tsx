import Link from 'next/link';
import TrendingCard from '../../components/home/TrendingCard';
import activitiesData from '../../data/Activities.json';

type Activity = {
  id: number;
  title: string;
  imageUrl: string;
  pricing: string;
  location?: string;
}

export const metadata = {
  title: 'Trending Activities',
};

export default function ActivitiesPage() {
  const activities = Array.isArray(activitiesData) ? (activitiesData as Activity[]) : [];

  return (
    <main className="min-h-screen px-[10vw] py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Trending Activities</h1>
        <Link href="/" className="text-[#0094CA]">Back to Home</Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {activities.map((a: Activity) => (
          <TrendingCard key={a.id} title={a.title} imageUrl={a.imageUrl} pricing={a.pricing} />
        ))}
      </div>
    </main>
  );
}
