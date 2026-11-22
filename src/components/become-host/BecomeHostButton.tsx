"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useHydrated } from "~/hooks/useHydrated";
import { useListTimeAction } from "~/hooks/useListTimeAction";

/**
 * The one way into the host application. Everyone who hasn't applied goes to
 * the form; someone waiting on review sees where it stands; an approved host
 * goes straight to creating an event.
 */
export default function BecomeHostButton({
  label = "Become a host",
  className,
  icon = <ArrowUpRight className="h-4 w-4" />,
}: {
  label?: string;
  className?: string;
  icon?: React.ReactNode | null;
}) {
  const { hostStatus } = useListTimeAction();
  // Host status comes from localStorage, so the first render matches the server.
  const hydrated = useHydrated();
  const status = hydrated ? hostStatus : null;

  const [href, text] =
    status === "approved"
      ? ["/host-dashboard/experiences/new", "Create an event"]
      : status === "pending" || status === "under_review"
        ? ["/become-host", "See your application"]
        : ["/become-host", label];

  return (
    <Link href={href} className={className}>
      {text}
      {icon}
    </Link>
  );
}
