import Link from "next/link";
import { FiChevronRight } from "react-icons/fi";

export interface SupportBreadcrumbItem {
  label: string;
  href?: string;
}

interface SupportBreadcrumbProps {
  items: SupportBreadcrumbItem[];
}

export default function SupportBreadcrumb({ items }: SupportBreadcrumbProps) {
  return (
    <nav className="mb-8 flex flex-wrap items-center gap-2 text-sm text-gray-400">
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
