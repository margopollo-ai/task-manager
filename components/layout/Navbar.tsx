"use client";

import { signOut } from "next-auth/react";
import Image from "next/image";
import { useState } from "react";
import { LogOut, User } from "lucide-react";

interface NavbarProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function Navbar({ user }: NavbarProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-end px-6 shrink-0">
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100 transition"
        >
          {user?.image ? (
            <Image src={user.image} alt="avatar" width={28} height={28} className="rounded-full" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="w-4 h-4 text-blue-600" />
            </div>
          )}
          <span className="text-sm font-medium text-gray-700">{user?.name ?? user?.email}</span>
        </button>

        {open && (
          <div className="absolute right-0 top-10 w-44 bg-white border border-gray-200 rounded-lg shadow-md z-50">
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
