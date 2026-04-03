export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { DashboardTaskList } from "@/components/dashboard/DashboardTaskList";
import { DashboardProjects } from "@/components/dashboard/DashboardProjects";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const memberships = await prisma.organizationMember.findMany({
    where: { userId: session.user.id },
    include: {
      organization: {
        include: { projects: true },
      },
    },
  });

  const assignedTasks = await prisma.task.findMany({
    where: { assigneeId: session.user.id, status: { in: ["TODO", "IN_PROGRESS", "IN_REVIEW"] } },
    include: { project: { include: { organization: true } } },
    orderBy: { updatedAt: "desc" },
    take: 5,
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {session.user.name?.split(" ")[0] ?? "there"}
        </h1>
        <p className="text-gray-500 text-sm mt-1">Here&apos;s what&apos;s on your plate today.</p>
      </div>

      {/* My Tasks */}
      <section>
        <h2 className="text-base font-semibold text-gray-700 mb-3">My open tasks</h2>
        <DashboardTaskList tasks={assignedTasks.map((t) => ({
          id: t.id,
          title: t.title,
          sequenceNumber: t.sequenceNumber,
          status: t.status,
          priority: t.priority,
          goalId: t.goalId,
          dueDate: t.dueDate ? t.dueDate.toISOString() : null,
          project: {
            key: t.project.key,
            id: t.project.id,
            organization: { slug: t.project.organization.slug },
          },
        }))} />
      </section>

      {/* Organizations & Projects */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-700">Your organizations</h2>
          <Link
            href="/onboarding"
            className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
          >
            <PlusCircle className="w-3.5 h-3.5" /> New organization
          </Link>
        </div>

        {memberships.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center">
            <p className="text-sm text-gray-500 mb-3">You&apos;re not part of any organization yet.</p>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-1.5 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <PlusCircle className="w-4 h-4" /> Create organization
            </Link>
          </div>
        ) : (
          <DashboardProjects memberships={memberships.map(({ organization }) => ({
            organization: {
              id: organization.id,
              name: organization.name,
              slug: organization.slug,
              projects: organization.projects.map((p) => ({ id: p.id, name: p.name, key: p.key })),
            },
          }))} />
        )}
      </section>
    </div>
  );
}

