"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Target, LayoutGrid, List, CalendarDays, Settings } from "lucide-react";

interface Project {
  id: string;
  name: string;
  key: string;
  orgSlug: string;
}

interface Props {
  projects: Project[];
}

function NavItem({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/" && pathname.startsWith(href));
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
        active
          ? "bg-[#e8f0fe] text-[#1a73e8] font-semibold"
          : "text-[#202124] hover:bg-[#f1f3f4]"
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function Sidebar({ projects }: Props) {
  return (
    <aside className="w-60 bg-white flex flex-col shrink-0" style={{ borderRight: "1px solid var(--gc-border)" }}>
      <div className="h-16 flex items-center px-4" style={{ borderBottom: "1px solid var(--gc-border)" }}>
        {/* spacer to align with navbar height */}
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        <NavItem href="/goals" icon={Target} label="Goals" />
        <NavItem href="/habits" icon={CalendarDays} label="Today" />

        {projects.map((p) => (
          <NavItem
            key={`board-${p.id}`}
            href={`/${p.orgSlug}/${p.key.toLowerCase()}/board`}
            icon={LayoutGrid}
            label={`Board${projects.length > 1 ? ` · ${p.name}` : ""}`}
          />
        ))}

        {projects.map((p) => (
          <NavItem
            key={`backlog-${p.id}`}
            href={`/${p.orgSlug}/${p.key.toLowerCase()}/backlog`}
            icon={List}
            label={`Backlog${projects.length > 1 ? ` · ${p.name}` : ""}`}
          />
        ))}

        <div className="pt-2 mt-2 border-t border-gray-100">
          <NavItem href="/settings" icon={Settings} label="Settings" />
        </div>
      </nav>
    </aside>
  );
}
