import Link from "next/link";
import { FiChevronRight } from "react-icons/fi";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav className={`flex flex-wrap items-center gap-2 text-sm text-gray-400 ${className ?? ""}`}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={`${item.label}-${index}`} className="flex items-center gap-2">
            {item.href && !isLast ? (
              <Link href={item.href} className="transition hover:text-[#0094CA]">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "font-medium text-gray-700" : undefined}>
                {item.label}
              </span>
            )}
            {!isLast && <FiChevronRight className="h-3.5 w-3.5 text-gray-300" />}
          </div>
        );
      })}
    </nav>
  );
}
