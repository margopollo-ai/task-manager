"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, List } from "lucide-react";
import { useState } from "react";

interface Props {
  orgSlug: string;
  projectKey: string;
  projectName: string;
  projectId: string;
}

export function ProjectNav({ orgSlug, projectKey, projectName, projectId }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const base = `/${orgSlug}/${projectKey}`;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(projectName);

  async function commit() {
    setEditing(false);
    const trimmed = draft.trim();
    if (!trimmed || trimmed === projectName) { setDraft(projectName); return; }
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    router.refresh();
  }

  const tabs = [
    { href: `${base}/board`, label: "Board", icon: LayoutGrid },
    { href: `${base}/backlog`, label: "Backlog", icon: List },
  ];

  return (
    <div className="bg-white border-b border-gray-200 px-6">
      <div className="flex items-center gap-1 pt-3 pb-0">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); commit(); }
              if (e.key === "Escape") { setEditing(false); setDraft(projectName); }
            }}
            className="text-sm font-semibold text-gray-700 mr-4 border border-blue-400 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 w-48"
          />
        ) : (
          <span
            onClick={() => { setDraft(projectName); setEditing(true); }}
            className="text-sm font-semibold text-gray-700 mr-4 cursor-text rounded px-1 py-0.5 hover:bg-gray-100 transition"
            title="Click to rename"
          >
            {projectName}
          </span>
        )}
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
