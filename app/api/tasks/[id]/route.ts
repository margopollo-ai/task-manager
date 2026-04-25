import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateTaskSchema } from "@/lib/validations/task";

const taskInclude = {
  assignee: { select: { id: true, name: true, image: true } },
  reporter: { select: { id: true, name: true, image: true } },
  goal: { select: { id: true, title: true, key: true, position: true } },
  comments: {
    include: { author: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: "asc" as const },
  },
  activities: {
    include: { actor: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: "asc" as const },
  },
  _count: { select: { comments: true } },
};

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const task = await prisma.task.findUnique({ where: { id }, include: taskInclude });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(task);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const body = await req.json();
    console.log(`[PATCH /api/tasks/${id}] body:`, JSON.stringify(body).slice(0, 300));
    const data = updateTaskSchema.parse(body);

    // Pull out scalar FK fields — Prisma requires relation-object form for updates
    const { assigneeId: assigneeIdData, goalId: goalIdData, ...restData } = data;

    const existing = await prisma.task.findUnique({ where: { id }, select: { status: true, assigneeId: true, priority: true, title: true, goalId: true, goalSequenceNumber: true } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Assign goalSequenceNumber when goalId is set for the first time or changed
    let goalSequenceNumber: number | undefined;
    if (goalIdData && goalIdData !== existing.goalId) {
      const lastGoalTask = await prisma.task.findFirst({
        where: { goalId: goalIdData },
        orderBy: { goalSequenceNumber: "desc" },
        select: { goalSequenceNumber: true },
      });
      goalSequenceNumber = (lastGoalTask?.goalSequenceNumber ?? 0) + 1;
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...restData,
        // Use relation objects instead of scalar FK fields
        assignee: assigneeIdData !== undefined
          ? (assigneeIdData ? { connect: { id: assigneeIdData } } : { disconnect: true })
          : undefined,
        goal: goalIdData !== undefined
          ? (goalIdData ? { connect: { id: goalIdData } } : { disconnect: true })
          : undefined,
        goalSequenceNumber: goalSequenceNumber ?? (goalIdData === null ? null : undefined),
        dueDate: restData.dueDate !== undefined ? (restData.dueDate ? new Date(restData.dueDate) : null) : undefined,
        scheduledStart: restData.scheduledStart !== undefined ? (restData.scheduledStart ? new Date(restData.scheduledStart) : null) : undefined,
        scheduledEnd: restData.scheduledEnd !== undefined ? (restData.scheduledEnd ? new Date(restData.scheduledEnd) : null) : undefined,
        recurrence: restData.recurrence ?? undefined,
      },
      include: taskInclude,
    });

    // Log relevant activity
    if (data.status && data.status !== existing.status) {
      await prisma.taskActivity.create({
        data: { taskId: id, actorId: session.user.id, type: "STATUS_CHANGED", payload: { from: existing.status, to: data.status } },
      });
    }
    if (assigneeIdData !== undefined && assigneeIdData !== existing.assigneeId) {
      await prisma.taskActivity.create({
        data: { taskId: id, actorId: session.user.id, type: "ASSIGNED", payload: { assigneeId: assigneeIdData } },
      });
    }
    if (data.priority && data.priority !== existing.priority) {
      await prisma.taskActivity.create({
        data: { taskId: id, actorId: session.user.id, type: "PRIORITY_CHANGED", payload: { from: existing.priority, to: data.priority } },
      });
    }

    console.log(`[PATCH /api/tasks/${id}] saved dueDate:`, task.dueDate, "goalId:", task.goalId);
    return NextResponse.json(task);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    const message = err instanceof Error ? err.message : String(err);
    console.error("PATCH /api/tasks/[id] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const task = await prisma.task.findUnique({ where: { id }, select: { id: true } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.task.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
