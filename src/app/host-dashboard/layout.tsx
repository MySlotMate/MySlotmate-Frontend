import HostShell from "~/components/host-dashboard/HostShell";

/** Every host page shares one shell, so the navigation never remounts. */
export default function HostDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <HostShell>{children}</HostShell>;
}
