import type { ReactNode } from "react";
import Navbar from "../Navbar";

interface SupportPageShellProps {
  children: ReactNode;
  contentClassName?: string;
}

export default function SupportPageShell({
  children,
  contentClassName = "max-w-[1120px]",
}: SupportPageShellProps) {
  return (
    <div className="min-h-screen bg-linear-to-b from-[#080914] via-[#080914] to-[#121426]">
      <Navbar />
      <main
        className={`site-x mx-auto w-full pt-24 pb-8 sm:pt-28 sm:pb-12 ${contentClassName}`}
      >
        {children}
      </main>
    </div>
  );
}
