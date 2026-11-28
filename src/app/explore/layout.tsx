import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Explore Experiences and 1:1 Sessions",
  description:
    "Find group experiences, 1:1 sessions with mentors and coaches, and the hosts behind them — all in one place on Myslotmate.",
  alternates: { canonical: "/explore" },
  openGraph: {
    title: "Explore Experiences and 1:1 Sessions | Myslotmate",
    description:
      "Discover curated activities and hosts near you, and book real-life moments that match how you feel.",
    url: "/explore",
  },
};

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
