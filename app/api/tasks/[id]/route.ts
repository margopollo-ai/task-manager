import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateTaskSchema } from "@/lib/validations/task";

const taskInclude = {
  assignee: { select: { id: true, name: true, image: true } },
  reporter: { select: { id: true, name: true, image: true } },
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
    const data = updateTaskSchema.parse(body);

    const existing = await prisma.task.findUnique({ where: { id }, select: { status: true, assigneeId: true, priority: true, title: true } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...data,
        dueDate: data.dueDate !== undefined ? (data.dueDate ? new Date(data.dueDate) : null) : undefined,
        scheduledStart: data.scheduledStart !== undefined ? (data.scheduledStart ? new Date(data.scheduledStart) : null) : undefined,
        scheduledEnd: data.scheduledEnd !== undefined ? (data.scheduledEnd ? new Date(data.scheduledEnd) : null) : undefined,
        recurrence: data.recurrence ?? undefined,
      },
      include: taskInclude,
    });

    // Log relevant activity
    if (data.status && data.status !== existing.status) {
      await prisma.taskActivity.create({
        data: { taskId: id, actorId: session.user.id, type: "STATUS_CHANGED", payload: { from: existing.status, to: data.status } },
      });
    }
    if (data.assigneeId !== undefined && data.assigneeId !== existing.assigneeId) {
      await prisma.taskActivity.create({
        data: { taskId: id, actorId: session.user.id, type: "ASSIGNED", payload: { assigneeId: data.assigneeId } },
      });
    }
    if (data.priority && data.priority !== existing.priority) {
      await prisma.taskActivity.create({
        data: { taskId: id, actorId: session.user.id, type: "PRIORITY_CHANGED", payload: { from: existing.priority, to: data.priority } },
      });
    }

    return NextResponse.json(task);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
