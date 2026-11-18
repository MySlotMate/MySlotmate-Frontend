import { type Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: "Stories & Guides from Northeast India | MySlotMate",
    // Keep the site-wide suffix on individual story titles.
    template: "%s | MySlotMate",
  },
  description:
    "Stories and guides from MySlotMate hosts and explorers across Northeast India: on hosting, meeting people and making time for real life.",
  alternates: { canonical: "/blogs" },
  openGraph: {
    title: "Stories & Guides | MySlotMate",
    description:
      "Stories from hosts and explorers across Northeast India, on what happens when people show up.",
    url: "/blogs",
  },
};

export default function BlogsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
