"use client";

import { BreadcrumbTrail } from "~/components/Breadcrumbs";

export interface SupportBreadcrumbItem {
  label: string;
  href?: string;
}

interface SupportBreadcrumbProps {
  items: SupportBreadcrumbItem[];
}

/** Support pages: the shared breadcrumb, with their usual spacing below. */
export default function SupportBreadcrumb({ items }: SupportBreadcrumbProps) {
  return <BreadcrumbTrail crumbs={items} className="!mb-8" />;
}
