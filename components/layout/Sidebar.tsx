"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Target, LayoutGrid, List, Settings } from "lucide-react";

interface Project {
  id: string;
  name: string;
  key: string;
  orgSlug: string;
}

interface Props {
  projects: Project[];
}

export function Sidebar({ projects }: Props) {
  const pathname = usePathname();

  function NavItem({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
    const active = pathname === href || (href !== "/" && pathname.startsWith(href));
    return (
      <Link
        href={href}
        className="flex items-center gap-3 px-4 py-2 rounded-full text-sm font-medium transition-colors"
        style={{
          background: active ? "var(--gc-blue-light)" : "transparent",
          color: active ? "var(--gc-blue)" : "var(--gc-text)",
          fontWeight: active ? 600 : 500,
        }}
        onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "var(--gc-surface)"; }}
        onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="truncate">{label}</span>
      </Link>
    );
  }

  return (
    <aside className="w-60 bg-white flex flex-col shrink-0" style={{ borderRight: "1px solid var(--gc-border)" }}>
      <div className="h-16 flex items-center px-4" style={{ borderBottom: "1px solid var(--gc-border)" }}>
        {/* spacer to align with navbar height */}
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        <NavItem href="/goals" icon={Target} label="Goals" />

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

        <div className="pt-2 mt-2" style={{ borderTop: "1px solid var(--gc-border)" }}>
          <NavItem href="/dashboard" icon={Settings} label="Settings" />
        </div>
      </nav>
    </aside>
  );
}
