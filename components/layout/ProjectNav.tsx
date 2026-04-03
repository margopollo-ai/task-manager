"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, List, Calendar } from "lucide-react";

interface Props {
  orgSlug: string;
  projectKey: string;
  projectName: string;
}

export function ProjectNav({ orgSlug, projectKey, projectName }: Props) {
  const pathname = usePathname();
  const base = `/${orgSlug}/${projectKey}`;

  const tabs = [
    { href: `${base}/board`, label: "Board", icon: LayoutGrid },
    { href: `${base}/backlog`, label: "Backlog", icon: List },
    { href: `${base}/calendar`, label: "Calendar", icon: Calendar },
  ];

  return (
    <div className="bg-white border-b border-gray-200 px-6">
      <div className="flex items-center gap-1 pt-3 pb-0">
        <span className="text-sm font-semibold text-gray-700 mr-4">{projectName}</span>
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition ${
                active
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
