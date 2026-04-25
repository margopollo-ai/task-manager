import { prisma } from "@/lib/prisma";

function getTodayBoundsUTC(tz: string): { start: Date; noon: Date } {
  const now = new Date();

  const todayStr = now.toLocaleDateString("en-CA", { timeZone: tz });

  const tzParts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric", month: "numeric", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => parseInt(tzParts.find((p) => p.type === type)!.value);
  const tzMs = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  const offsetMs = now.getTime() - tzMs;

  const [y, m, d] = todayStr.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0) + offsetMs);
  const noon  = new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0) + offsetMs);
  return { start, noon };
}

/**
 * Resets any non-done tasks with past due dates to today (noon in the user's timezone).
 * Safe to call from any server component or page.
 */
export async function resetOverdueTasks(userId: string) {
  const userRecord = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });
  const tz = userRecord?.timezone ?? "America/Los_Angeles";

  const { start: startOfToday, noon: noonToday } = getTodayBoundsUTC(tz);

  const memberships = await prisma.organizationMember.findMany({
    where: { userId },
    select: { organizationId: true },
  });
  const orgIds = memberships.map((m) => m.organizationId);

  const projects = await prisma.project.findMany({
    where: { organizationId: { in: orgIds } },
    select: { id: true },
  });
  const projectIds = projects.map((p) => p.id);

  await prisma.task.updateMany({
    where: {
      projectId: { in: projectIds },
      dueDate: { lt: startOfToday },
      status: { notIn: ["DONE", "CANCELLED"] },
    },
    data: { dueDate: noonToday },
  });
}
