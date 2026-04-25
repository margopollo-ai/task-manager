import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { HabitsClientNew as HabitsClient } from "./HabitsClientNew";
import { resetOverdueTasks } from "@/lib/resetOverdueTasks";

function getTodayEndUTC(tz: string): Date {
  const now = new Date();
  const todayStr = now.toLocaleDateString("en-CA", { timeZone: tz });
  const tzParts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric", month: "numeric", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => parseInt(tzParts.find(p => p.type === type)!.value);
  const tzMs = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  const offsetMs = now.getTime() - tzMs;
  const [y, m, d] = todayStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999) + offsetMs);
}

export default async function HabitsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  // Reset any past-due (non-done) tasks to today
  await resetOverdueTasks(session.user.id);

  // Get all organizations the user is a member of
  const memberships = await prisma.organizationMember.findMany({
    where: { userId: session.user.id },
    include: { organization: true },
  });

  const orgIds = memberships.map(m => m.organizationId);

  // Get all projects in those organizations
  const projects = await prisma.project.findMany({
    where: { organizationId: { in: orgIds } },
  });

  const projectIds = projects.map(p => p.id);

  const userRecord = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { timezone: true },
  });
  const tz = userRecord?.timezone ?? "America/Los_Angeles";
  const endOfToday = getTodayEndUTC(tz);
  console.log("[habits] tz:", tz, "endOfToday:", endOfToday.toISOString());

  // Tasks due today (lte endOfToday catches anything up to end of today in user's TZ)
  const dueTodayTasks = await prisma.task.findMany({
    where: {
      projectId: { in: projectIds },
      dueDate: { not: null, lte: endOfToday },
      status: { notIn: ["DONE", "CANCELLED"] },
    },
    include: {
      goal: { select: { id: true, title: true, key: true, position: true } },
      project: { select: { id: true, name: true, key: true } },
    },
    orderBy: [{ dueDate: "asc" }],
  });

  console.log("[habits] dueTodayTasks:", dueTodayTasks.map(t => ({ id: t.id, title: t.title, dueDate: t.dueDate, status: t.status })));

  // Get all daily tasks from those projects
  const tasks = await prisma.task.findMany({
    where: {
      projectId: { in: projectIds },
      recurrence: 'DAILY'
    },
    include: {
      assignee: { select: { id: true, name: true } },
      goal: { select: { id: true, title: true, key: true, position: true } },
      project: { select: { id: true, name: true, key: true } },
    },
    orderBy: [{ position: "asc" }],
  });

  console.log("[habits] daily tasks:", tasks.map(t => ({ id: t.id, title: t.title, dueDate: t.dueDate, recurrence: t.recurrence })));

  const members = await prisma.organizationMember.findMany({
    where: { organizationId: { in: orgIds } },
    include: { user: { select: { id: true, name: true, image: true } } },
  });

  return (
    <HabitsClient
      dueTodayTasks={dueTodayTasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        position: t.position,
        habitPosition: t.habitPosition,
        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
        recurrence: t.recurrence,
        goal: t.goal ? { id: t.goal.id, title: t.goal.title, key: t.goal.key, position: t.goal.position } : null,
        project: t.project ? { id: t.project.id, name: t.project.name, key: t.project.key } : null,
      }))}
      tasks={tasks.map((t) => ({
        id: t.id,
        sequenceNumber: t.sequenceNumber,
        goalSequenceNumber: t.goalSequenceNumber,
        title: t.title,
        status: t.status,
        priority: t.priority,
        position: t.position,
        habitPosition: t.habitPosition,
        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
        assignee: t.assignee ? { name: t.assignee.name } : null,
        recurrence: t.recurrence,
        goal: t.goal
          ? { id: t.goal.id, title: t.goal.title, key: t.goal.key, position: t.goal.position }
          : null,
        project: t.project
          ? { id: t.project.id, name: t.project.name, key: t.project.key }
          : null,
      }))}
      members={members.map((m) => m.user)}
      currentUserId={session.user.id!}
    />
  );
}