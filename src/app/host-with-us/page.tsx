import { type Metadata } from "next";
import HostWithUsPage from "~/components/website/host/HostWithUsPage";

export const metadata: Metadata = {
  title: { absolute: "Host an Event for Free in Northeast India | MySlotMate" },
  description:
    "Host workshops, meetups, open mics, food tables, treks or one-on-one sessions in Guwahati and across Northeast India. Free to host: no fees, no commission.",
  alternates: { canonical: "/host-with-us" },
  openGraph: {
    title: "Host an event for free | MySlotMate",
    description:
      "Share what you love with people across Northeast India. Hosting on MySlotMate is completely free.",
    url: "/host-with-us",
  },
};

export default function Page() {
  return <HostWithUsPage />;
}
