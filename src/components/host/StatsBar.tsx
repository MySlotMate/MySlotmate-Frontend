"use client";

import { HiOutlineCalendar } from "react-icons/hi";
import { FiUsers, FiStar } from "react-icons/fi";

interface StatsBarProps {
  total_events_hosted: number;
  total_people_met: number;
  avg_rating: number;
}

const statsConfig = [
  {
    key: "total_events_hosted" as const,
    label: "Experiences Hosted",
    icon: <HiOutlineCalendar className="h-6 w-6 text-[#0094CA]" />,
  },
  {
    key: "total_people_met" as const,
    label: "People Met",
    icon: <FiUsers className="h-6 w-6 text-[#E85D3A]" />,
  },
  {
    key: "avg_rating" as const,
    label: "Avg. Rating",
    icon: <FiStar className="h-6 w-6 text-[#F5A623]" />,
  },
];

export default function StatsBar({ total_events_hosted, total_people_met, avg_rating }: StatsBarProps) {
  const values: Record<string, number> = { total_events_hosted, total_people_met, avg_rating };

  return (
    <div className="grid grid-cols-3 divide-x divide-gray-200 rounded-2xl border border-gray-100 bg-white py-8 shadow-sm">
      {statsConfig.map((s) => (
        <div key={s.key} className="flex flex-col items-center gap-2">
          {s.icon}
          <p className="text-xs text-gray-500">{s.label}</p>
          <p className="text-2xl font-bold text-gray-900">
            {s.key === "total_people_met"
              ? `${values[s.key]}+`
              : String(values[s.key])}
          </p>
        </div>
      ))}
    </div>
  );
}
