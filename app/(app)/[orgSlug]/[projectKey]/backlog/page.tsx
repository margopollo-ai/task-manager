import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { BacklogClient } from "./BacklogClient";
import { resetOverdueTasks } from "@/lib/resetOverdueTasks";

interface Props {
  params: Promise<{ orgSlug: string; projectKey: string }>;
}

export default async function BacklogPage({ params }: Props) {
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

  // Assign all unassigned tasks (across all the user's projects) to the current user.
  // No-ops once everything is assigned.
  const allMemberships = await prisma.organizationMember.findMany({
    where: { userId: session.user.id },
    select: { organizationId: true },
  });
  const allOrgIds = allMemberships.map((m: { organizationId: string }) => m.organizationId);
  const allProjects = await prisma.project.findMany({
    where: { organizationId: { in: allOrgIds } },
    select: { id: true },
  });
  await prisma.task.updateMany({
    where: { projectId: { in: allProjects.map((p: { id: string }) => p.id) }, assigneeId: null },
    data: { assigneeId: session.user.id },
  });

  const members = await prisma.organizationMember.findMany({
    where: { organizationId: org.id },
    include: { user: { select: { id: true, name: true, image: true } } },
  });

  return (
    <BacklogClient
      projectId={project.id}
      projectKey={project.key}
      members={members.map((m) => m.user)}
      currentUserId={session.user.id!}
    />
  );
}
