"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Target, Settings, List, LayoutGrid } from "lucide-react";

interface Project {
  id: string;
  name: string;
  key: string;
  orgSlug: string;
}

interface Props {
  projects: Project[];
}

const navItems = [
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/dashboard", label: "Tasks", icon: LayoutDashboard },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ projects }: Props) {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
      <div className="h-14 flex items-center px-4 border-b border-gray-200">
        <span className="font-bold text-blue-600 text-lg tracking-tight">TaskFlow</span>
      </div>
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}

        {projects.length > 0 && (
          <>
            <div className="pt-3">
              <p className="px-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Board
              </p>
              {projects.map((p) => {
                const href = `/${p.orgSlug}/${p.key.toLowerCase()}/board`;
                const active = pathname === href;
                return (
                  <Link
                    key={p.id}
                    href={href}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                      active
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4 shrink-0" />
                    <span className="truncate">{p.name}</span>
                  </Link>
                );
              })}
            </div>

            <div className="pt-3">
              <p className="px-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Backlog
              </p>
              {projects.map((p) => {
                const href = `/${p.orgSlug}/${p.key.toLowerCase()}/backlog`;
                const active = pathname === href;
                return (
                  <Link
                    key={p.id}
                    href={href}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                      active
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <List className="w-4 h-4 shrink-0" />
                    <span className="truncate">{p.name}</span>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </nav>
    </aside>
  );
}
