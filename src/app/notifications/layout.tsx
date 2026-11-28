import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notifications | Myslotmate",
  robots: { index: false },
};

export default function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
