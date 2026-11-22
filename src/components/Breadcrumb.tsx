"use client";

import { BreadcrumbTrail } from "./Breadcrumbs";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

/** Pages that list their own steps; same look and back button as Breadcrumbs. */
export default function Breadcrumb({ items, className }: BreadcrumbProps) {
  return <BreadcrumbTrail crumbs={items} className={className} />;
}
