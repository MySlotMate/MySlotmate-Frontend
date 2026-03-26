import type { ReactNode } from "react";
import Navbar from "../Navbar";

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
      <Navbar />
      <main
        className={`mx-auto w-full site-x py-8 sm:py-12 ${contentClassName}`}
      >
        {children}
      </main>
    </div>
  );
}
