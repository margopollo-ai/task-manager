"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Step = "org" | "project";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("org");
  const [orgId, setOrgId] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Org form state
  const [orgName, setOrgName] = useState("");
  const [slug, setSlug] = useState("");

  // Project form state
  const [projectName, setProjectName] = useState("");
  const [projectKey, setProjectKey] = useState("");

  function autoSlug(name: string) {
    return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 48);
  }

  function autoKey(name: string) {
    return name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "PRJ";
  }

  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: orgName, slug }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Something went wrong.");
      setLoading(false);
      return;
    }

    setOrgId(data.id);
    setOrgSlug(data.slug);
    setStep("project");
    setLoading(false);
  }

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: projectName, key: projectKey, organizationId: orgId }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Something went wrong.");
      setLoading(false);
      return;
    }

    router.push(`/${orgSlug}/${data.key.toLowerCase()}/backlog`);
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Step n={1} active={step === "org"} done={step === "project"} label="Organization" />
          <div className="flex-1 h-px bg-gray-200" />
          <Step n={2} active={step === "project"} done={false} label="Project" />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        {step === "org" ? (
          <>
            <h1 className="text-xl font-bold text-gray-900 mb-1">Create your organization</h1>
            <p className="text-sm text-gray-500 mb-5">An organization holds your projects and team members.</p>

            <form onSubmit={handleCreateOrg} className="space-y-4">
              {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organization name</label>
                <input
                  required
                  value={orgName}
                  onChange={(e) => {
                    setOrgName(e.target.value);
                    setSlug(autoSlug(e.target.value));
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Acme Corp"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL slug <span className="text-gray-400 font-normal">taskflow.app/<strong>{slug || "…"}</strong></span>
                </label>
                <input
                  required
                  value={slug}
                  onChange={(e) => setSlug(autoSlug(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="acme-corp"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? "Creating…" : "Create organization →"}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-gray-900 mb-1">Create your first project</h1>
            <p className="text-sm text-gray-500 mb-5">Projects hold tasks and have a short key used in task IDs (e.g. PRJ-1).</p>

            <form onSubmit={handleCreateProject} className="space-y-4">
              {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project name</label>
                <input
                  required
                  value={projectName}
                  onChange={(e) => {
                    setProjectName(e.target.value);
                    setProjectKey(autoKey(e.target.value));
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="My First Project"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project key <span className="text-gray-400 font-normal">(used in task IDs like <strong>{projectKey || "PRJ"}-1</strong>)</span>
                </label>
                <input
                  required
                  value={projectKey}
                  onChange={(e) => setProjectKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="PRJ"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? "Creating…" : "Create project →"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function Step({ n, active, done, label }: { n: number; active: boolean; done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition ${
        done ? "bg-green-500 text-white" : active ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"
      }`}>
        {done ? "✓" : n}
      </div>
      <span className={`text-xs font-medium ${active ? "text-gray-800" : "text-gray-400"}`}>{label}</span>
    </div>
  );
}
