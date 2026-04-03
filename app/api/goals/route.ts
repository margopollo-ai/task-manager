import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createGoalSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  key: z.string().min(1).max(10).optional(),
});

function generateGoalKey(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.slice(0, 3).map((w) => w[0]).join("").toUpperCase();
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const goals = await prisma.goal.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { tasks: true } } },
    orderBy: { position: "asc" },
  });

  return NextResponse.json(goals);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = createGoalSchema.parse(body);

    const last = await prisma.goal.findFirst({
      where: { userId: session.user.id },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    const position = (last?.position ?? 0) + 1000;

    // Generate a unique key for this user
    let baseKey = data.key ? data.key.toUpperCase() : generateGoalKey(data.title);
    let key = baseKey;
    let suffix = 2;
    while (await prisma.goal.findFirst({ where: { userId: session.user.id, key } })) {
      key = baseKey + suffix++;
    }

    const goal = await prisma.goal.create({
      data: { ...data, key, userId: session.user.id, position },
      include: { _count: { select: { tasks: true } } },
    });

    return NextResponse.json(goal, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
