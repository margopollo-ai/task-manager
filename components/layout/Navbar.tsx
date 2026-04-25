"use client";

import { signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogOut, Settings } from "lucide-react";

interface Project {
  id: string;
  name: string;
  key: string;
  orgSlug: string;
}

interface NavbarProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  projects?: Project[];
}

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/" && pathname.startsWith(href));
  return (
    <Link
      href={href}
      className={`px-4 py-2 text-sm font-medium rounded-full transition-colors whitespace-nowrap ${
        active
          ? "bg-[#e8f0fe] text-[#1a73e8] font-semibold"
          : "text-[#202124] hover:bg-[#f1f3f4]"
      }`}
    >
      {label}
    </Link>
  );
}

export function Navbar({ user, projects = [] }: NavbarProps) {
  const [open, setOpen] = useState(false);

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <header className="bg-white shrink-0" style={{ borderBottom: "1px solid var(--gc-border)" }}>
      {/* Top row: logo + user menu */}
      <div className="h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/bloom-icon.png" alt="Bloom" width={32} height={32} className="rounded-md" />
          <span className="text-lg font-semibold tracking-tight" style={{ color: "var(--gc-text)", fontFamily: "var(--font-sans)" }}>
            Bloom
          </span>
        </div>

        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 rounded-full p-1 hover:bg-gray-100 transition"
            title={user?.name ?? user?.email ?? ""}
          >
            {user?.image ? (
              <Image src={user.image} alt="avatar" width={32} height={32} className="rounded-full" />
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium" style={{ background: "var(--gc-blue)" }}>
                {initials}
              </div>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-11 w-48 bg-white rounded-2xl shadow-lg z-50 py-2 border" style={{ borderColor: "var(--gc-border)" }}>
              <div className="px-4 py-2 border-b" style={{ borderColor: "var(--gc-border)" }}>
                <p className="text-sm font-medium" style={{ color: "var(--gc-text)" }}>{user?.name}</p>
                <p className="text-xs" style={{ color: "var(--gc-text-secondary)" }}>{user?.email}</p>
              </div>
              <Link
                href="/settings"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition"
                style={{ color: "var(--gc-text)" }}
              >
                <Settings className="w-4 h-4" style={{ color: "var(--gc-text-secondary)" }} />
                Settings
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition"
                style={{ color: "var(--gc-text)" }}
              >
                <LogOut className="w-4 h-4" style={{ color: "var(--gc-text-secondary)" }} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom row: nav links */}
      <nav className="flex items-center gap-1 px-3 pb-2 overflow-x-auto">
        <NavLink href="/today" label="Today" />
        <NavLink href="/goals" label="Goals" />
        {projects.map((p) => (
          <NavLink
            key={`board-${p.id}`}
            href={`/${p.orgSlug}/${p.key.toLowerCase()}/board`}
            label={projects.length > 1 ? `Board · ${p.name}` : "Board"}
          />
        ))}
        {projects.map((p) => (
          <NavLink
            key={`backlog-${p.id}`}
            href={`/${p.orgSlug}/${p.key.toLowerCase()}/backlog`}
            label={projects.length > 1 ? `Backlog · ${p.name}` : "Backlog"}
          />
        ))}
      </nav>
    </header>
  );
}
