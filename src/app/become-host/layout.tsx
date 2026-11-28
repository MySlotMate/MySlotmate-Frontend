import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Become a Host",
  description:
    "Become a host on Myslotmate. Share your skills, run experiences, and earn doing what you love. Set your own schedule and start hosting in minutes.",
  alternates: { canonical: "/become-host" },
  openGraph: {
    title: "Become a Host | Myslotmate",
    description:
      "Share your skills, run experiences, and earn doing what you love. Start hosting on Myslotmate.",
    url: "/become-host",
  },
};

export default function BecomeHostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
