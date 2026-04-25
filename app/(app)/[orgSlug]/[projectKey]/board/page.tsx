import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { BoardClient } from "./BoardClient";
import { resetOverdueTasks } from "@/lib/resetOverdueTasks";

interface Props {
  params: Promise<{ orgSlug: string; projectKey: string }>;
}

export default async function BoardPage({ params }: Props) {
  const { orgSlug, projectKey } = await params;
  const session = await auth();
  if (!session?.user?.id) return null;

  await resetOverdueTasks(session.user.id);

  const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) notFound();

  const project = await prisma.project.findFirst({
    where: { organizationId: org.id, key: projectKey.toUpperCase() },
  });
  if (!project) notFound();

  const members = await prisma.organizationMember.findMany({
    where: { organizationId: org.id },
    include: { user: { select: { id: true, name: true, image: true } } },
  });

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
      projectId={project.id}
      projectKey={project.key}
      tasks={tasks.map((t) => ({
        id: t.id,
        sequenceNumber: t.sequenceNumber,
        goalSequenceNumber: t.goalSequenceNumber,
        title: t.title,
        status: t.status,
        priority: t.priority,
        position: t.position,
        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
        assignee: t.assignee ? { name: t.assignee.name } : null,
        recurrence: t.recurrence,
        goal: t.goal
          ? { id: t.goal.id, title: t.goal.title, key: t.goal.key, position: t.goal.position }
          : null,
      }))}
      members={members.map((m) => m.user)}
      currentUserId={session.user.id!}
    />
  );
}
