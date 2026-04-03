import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { BacklogClient } from "./BacklogClient";

interface Props {
  params: Promise<{ orgSlug: string; projectKey: string }>;
}

export default async function BacklogPage({ params }: Props) {
  const { orgSlug, projectKey } = await params;
  const session = await auth();
  if (!session?.user?.id) return null;

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

  return (
    <BacklogClient
      projectId={project.id}
      projectKey={project.key}
      members={members.map((m) => m.user)}
      currentUserId={session.user.id!}
    />
  );
}
