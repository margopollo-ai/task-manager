import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/layout/Navbar";
import { TaskDetailPanel } from "@/components/tasks/TaskDetailPanel";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  let memberships = await prisma.organizationMember.findMany({
    where: { userId: session.user.id },
    include: { organization: { include: { projects: { orderBy: { name: "asc" } } } } },
  });

  // Auto-create a default org + project for new users
  if (memberships.length === 0) {
    const userName = session.user.name ?? session.user.email ?? "My";
    const orgSlug = userName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 48) + "-" + Date.now().toString(36);
    const org = await prisma.organization.create({
      data: {
        name: userName,
        slug: orgSlug,
        members: { create: { userId: session.user.id, role: "OWNER" } },
        projects: { create: { name: "My Tasks", key: "TASK" } },
      },
      include: { projects: true },
    });
    redirect(`/${orgSlug}/${org.projects[0].key.toLowerCase()}/board`);
  }

  const projects = memberships.flatMap(({ organization }) =>
    organization.projects.map((p) => ({
      id: p.id,
      name: p.name,
      key: p.key,
      orgSlug: organization.slug,
    }))
  );

  return (
    <div className="flex flex-col h-screen" style={{ background: "var(--gc-white)" }}>
      <Navbar user={session.user} projects={projects} />
      <main className="flex-1 overflow-auto p-4 md:p-7" style={{ background: "var(--gc-white)" }}>{children}</main>
      <TaskDetailPanel />
    </div>
  );
}
