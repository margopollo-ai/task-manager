import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateGoalSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  key: z.string().min(1).max(10).optional(),
  position: z.number().optional(),
});

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const goal = await prisma.goal.findUnique({
    where: { id, userId: session.user.id },
    include: {
      tasks: {
        include: {
          assignee: { select: { id: true, name: true, image: true } },
          project: { include: { organization: { select: { slug: true } } } },
        },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { tasks: true } },
    },
  });

  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(goal);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const body = await req.json();
    const data = updateGoalSchema.parse(body);

    const goal = await prisma.goal.update({
      where: { id, userId: session.user.id },
      data,
      include: { _count: { select: { tasks: true } } },
    });

    return NextResponse.json(goal);
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
  const goal = await prisma.goal.findUnique({ where: { id, userId: session.user.id }, select: { id: true } });
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.goal.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
