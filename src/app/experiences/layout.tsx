import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse Experiences",
  description:
    "Browse and book unique experiences hosted by real people — workshops, city walks, coffee chats, adventures and more. Find your next moment on Myslotmate.",
  alternates: { canonical: "/experiences" },
  openGraph: {
    title: "Browse Experiences | Myslotmate",
    description:
      "Browse and book unique experiences hosted by real people near you. Find your next moment on Myslotmate.",
    url: "/experiences",
  },
};

export default function ExperiencesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
