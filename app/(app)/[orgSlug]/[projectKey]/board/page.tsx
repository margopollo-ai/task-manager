import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { BoardClient } from "./BoardClient";

interface Props {
  params: Promise<{ orgSlug: string; projectKey: string }>;
}

export default async function BoardPage({ params }: Props) {
  const { orgSlug, projectKey } = await params;
  const session = await auth();
  if (!session?.user?.id) return null;

  const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) notFound();

  const project = await prisma.project.findFirst({
    where: { organizationId: org.id, key: projectKey.toUpperCase() },
  });
  if (!project) notFound();

  const tasks = await prisma.task.findMany({
    where: { projectId: project.id },
    include: {
      assignee: { select: { id: true, name: true } },
      goal: { select: { id: true, title: true, key: true, position: true } },
    },
    orderBy: [{ position: "asc" }],
  });

  return (
    <BoardClient
      projectKey={project.key}
      tasks={tasks.map((t) => ({
        id: t.id,
        sequenceNumber: t.sequenceNumber,
        goalSequenceNumber: t.goalSequenceNumber,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
        assignee: t.assignee ? { name: t.assignee.name } : null,
        goal: t.goal
          ? { id: t.goal.id, title: t.goal.title, key: t.goal.key, position: t.goal.position }
          : null,
      }))}
    />
  );
}
