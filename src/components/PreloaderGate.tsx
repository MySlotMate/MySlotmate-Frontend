"use client";

import { useEffect, useState } from "react";
import Preloader from "./Preloader";

const PRELOADER_DURATION_MS = 700;

export default function PreloaderGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isPreloading, setIsPreloading] = useState(true);

  useEffect(() => {
    const id = setTimeout(() => setIsPreloading(false), PRELOADER_DURATION_MS);
    return () => clearTimeout(id);
  }, []);

  if (isPreloading) return <Preloader />;
  return <>{children}</>;
}

