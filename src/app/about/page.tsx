import { type Metadata } from "next";
import AboutPage from "~/components/website/AboutPage";

export const metadata: Metadata = {
  title: { absolute: "About Myslotmate | Events Across Northeast India" },
  description:
    "Myslotmate brings the events, communities and professionals of Northeast India into one place, so finding something real to do with real people is easy.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Myslotmate",
    description:
      "Northeast India’s events, communities and professionals in one place. More reasons to step outside.",
    url: "/about",
  },
};

export default function Page() {
  return <AboutPage />;
}
