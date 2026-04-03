"use client";

import { signOut } from "next-auth/react";
import Image from "next/image";
import { useState } from "react";
import { LogOut } from "lucide-react";

interface NavbarProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function Navbar({ user }: NavbarProps) {
  const [open, setOpen] = useState(false);

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <header className="h-16 bg-white border-b flex items-center justify-between px-4 shrink-0" style={{ borderColor: "var(--gc-border)" }}>
      {/* Logo */}
      <div className="flex items-center gap-2 pl-1">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="6" fill="#1a73e8" />
          <path d="M8 14h12M14 8v12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <span className="text-lg font-semibold tracking-tight" style={{ color: "var(--gc-text)", fontFamily: "var(--font-sans)" }}>
          TaskFlow
        </span>
      </div>

      {/* User menu */}
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
    </header>
  );
}
