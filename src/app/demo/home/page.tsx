import { notFound } from "next/navigation";
import HomeFeed from "~/components/home/HomeFeed";

export const metadata = { title: "Demo: app home", robots: { index: false } };

/** Local preview of the signed-in home, for layout checks. Never in production. */
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="min-h-screen bg-[#080914] text-white max-md:pb-28">
      <HomeFeed />
    </main>
  );
}
