import type { ReactNode } from "react";
import SupportNavbar from "./SupportNavbar";

interface SupportPageShellProps {
  children: ReactNode;
  contentClassName?: string;
}

export default function SupportPageShell({
  children,
  contentClassName = "max-w-6xl",
}: SupportPageShellProps) {
  return (
    <div className="min-h-screen bg-linear-to-b from-[#ecf9ff] via-[#f7fcff] to-white">
      <SupportNavbar />
      <main
        className={`mx-auto w-full px-4 py-8 sm:px-6 sm:py-12 lg:px-8 ${contentClassName}`}
      >
        {children}
      </main>
    </div>
  );
}
