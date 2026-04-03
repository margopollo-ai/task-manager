"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil } from "lucide-react";

interface Project {
  id: string;
  name: string;
  key: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  projects: Project[];
}

export function DashboardProjects({ memberships }: { memberships: { organization: Organization }[] }) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      {memberships.map(({ organization }) => (
        <div key={organization.id} className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="font-semibold text-gray-800 mb-2">{organization.name}</h3>
          <div className="flex flex-wrap gap-2">
            {organization.projects.map((project) => (
              <ProjectChip
                key={project.id}
                project={project}
                orgSlug={organization.slug}
                onRenamed={() => router.refresh()}
              />
            ))}
            <Link
              href={`/${organization.slug}/new-project`}
              className="text-xs text-blue-500 hover:underline px-2.5 py-1"
            >
              + New project
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProjectChip({ project, orgSlug, onRenamed }: { project: Project; orgSlug: string; onRenamed: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(project.name);

  async function commit() {
    setEditing(false);
    const trimmed = draft.trim();
    if (!trimmed || trimmed === project.name) { setDraft(project.name); return; }
    await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    onRenamed();
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          if (e.key === "Escape") { setEditing(false); setDraft(project.name); }
        }}
        className="text-xs border border-blue-400 rounded-md px-2.5 py-1 text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-500 w-36"
      />
    );
  }

  return (
    <div className="group flex items-center gap-1 bg-gray-100 hover:bg-blue-50 rounded-md px-2.5 py-1 transition">
      <Link
        href={`/${orgSlug}/${project.key.toLowerCase()}/board`}
        className="text-xs text-gray-700 group-hover:text-blue-700"
      >
        {project.name}
      </Link>
      <button
        onClick={() => { setDraft(project.name); setEditing(true); }}
        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition"
        title="Rename project"
      >
        <Pencil className="w-3 h-3" />
      </button>
    </div>
  );
}
