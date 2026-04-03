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
      goal: { select: { key: true, position: true } },
      _count: { select: { comments: true } },
    },
  });

  const PRIORITY_RANK: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

  const sorted = tasks.sort((a, b) => {
    // 1. Goal position (tasks with a goal first, ordered by goal position; no goal = last)
    const aGoalPos = a.goal ? a.goal.position : Infinity;
    const bGoalPos = b.goal ? b.goal.position : Infinity;
    if (aGoalPos !== bGoalPos) return aGoalPos - bGoalPos;

    // 2. Task priority (URGENT first)
    const aPriority = PRIORITY_RANK[a.priority] ?? 99;
    const bPriority = PRIORITY_RANK[b.priority] ?? 99;
    if (aPriority !== bPriority) return aPriority - bPriority;

    // 3. Due date (nearest first, nulls last)
    if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });

  return NextResponse.json(sorted);
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

    // Compute per-goal sequence number if a goal is set
    let goalSequenceNumber: number | undefined;
    if (data.goalId) {
      const lastGoalTask = await prisma.task.findFirst({
        where: { goalId: data.goalId },
        orderBy: { goalSequenceNumber: "desc" },
        select: { goalSequenceNumber: true },
      });
      goalSequenceNumber = (lastGoalTask?.goalSequenceNumber ?? 0) + 1;
    }

    const task = await prisma.task.create({
      data: {
        ...data,
        sequenceNumber,
        goalSequenceNumber,
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
