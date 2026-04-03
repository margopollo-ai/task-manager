import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface Props {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string; projectKey: string }>;
}

export default async function ProjectLayout({ children, params }: Props) {
  const { orgSlug, projectKey } = await params;
  const session = await auth();
  if (!session?.user?.id) return null;

  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    include: { members: { where: { userId: session.user.id } } },
  });

  if (!org || org.members.length === 0) notFound();

  const project = await prisma.project.findFirst({
    where: { organizationId: org.id, key: projectKey.toUpperCase() },
  });

  if (!project) notFound();

  return <>{children}</>;
}
