import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTaskSchema } from "@/lib/validations/task";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const status = searchParams.get("status");
  const assigneeId = searchParams.get("assigneeId");
  const priority = searchParams.get("priority");

  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

  const tasks = await prisma.task.findMany({
    where: {
      projectId,
      ...(status ? { status: status as never } : {}),
      ...(assigneeId ? { assigneeId } : {}),
      ...(priority ? { priority: priority as never } : {}),
    },
    include: {
      assignee: { select: { id: true, name: true, image: true } },
      reporter: { select: { id: true, name: true, image: true } },
      _count: { select: { comments: true } },
    },
    orderBy: [{ status: "asc" }, { position: "asc" }],
  });

  return NextResponse.json(tasks);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = createTaskSchema.parse(body);

    // Get next sequence number for this project
    const lastTask = await prisma.task.findFirst({
      where: { projectId: data.projectId },
      orderBy: { sequenceNumber: "desc" },
      select: { sequenceNumber: true },
    });
    const sequenceNumber = (lastTask?.sequenceNumber ?? 0) + 1;

    // Position at the end of TODO column
    const lastTodo = await prisma.task.findFirst({
      where: { projectId: data.projectId, status: "TODO" },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    const position = (lastTodo?.position ?? 0) + 1000;

    const task = await prisma.task.create({
      data: {
        ...data,
        sequenceNumber,
        position,
        reporterId: session.user.id,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        scheduledStart: data.scheduledStart ? new Date(data.scheduledStart) : null,
        scheduledEnd: data.scheduledEnd ? new Date(data.scheduledEnd) : null,
      },
      include: {
        assignee: { select: { id: true, name: true, image: true } },
        reporter: { select: { id: true, name: true, image: true } },
        _count: { select: { comments: true } },
      },
    });

    await prisma.taskActivity.create({
      data: {
        taskId: task.id,
        actorId: session.user.id,
        type: "CREATED",
        payload: { title: task.title },
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
