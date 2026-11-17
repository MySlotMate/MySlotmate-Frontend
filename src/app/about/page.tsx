import { type Metadata } from "next";
import AboutPage from "~/components/website/AboutPage";

export const metadata: Metadata = {
  title: { absolute: "About MySlotMate | Events Across Northeast India" },
  description:
    "MySlotMate brings the events, communities and professionals of Northeast India into one place, so finding something real to do with real people is easy.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About MySlotMate",
    description:
      "Northeast India’s events, communities and professionals in one place. More reasons to step outside.",
    url: "/about",
  },
};

export default function Page() {
  return <AboutPage />;
}
