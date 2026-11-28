import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Meet Our Hosts",
  description:
    "Meet verified hosts on Myslotmate. Browse experts, creators, and locals offering workshops and experiences — and book time with the people you want to meet.",
  alternates: { canonical: "/hosts" },
  openGraph: {
    title: "Meet Our Hosts | Myslotmate",
    description:
      "Browse verified experts, creators, and locals offering experiences — and book time with the people you want to meet.",
    url: "/hosts",
  },
};

export default function HostsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
