import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { TaskDetailPanel } from "@/components/tasks/TaskDetailPanel";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const memberships = await prisma.organizationMember.findMany({
    where: { userId: session.user.id },
    include: { organization: { include: { projects: { orderBy: { name: "asc" } } } } },
  });

  const projects = memberships.flatMap(({ organization }) =>
    organization.projects.map((p) => ({
      id: p.id,
      name: p.name,
      key: p.key,
      orgSlug: organization.slug,
    }))
  );

  return (
    <div className="flex h-screen" style={{ background: "var(--gc-white)" }}>
      <Sidebar projects={projects} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar user={session.user} />
        <main className="flex-1 overflow-auto p-7" style={{ background: "var(--gc-white)" }}>{children}</main>
      </div>
      <TaskDetailPanel />
    </div>
  );
}
