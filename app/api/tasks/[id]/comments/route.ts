import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ content: z.string().min(1).max(5000) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: taskId } = await params;

  try {
    const { content } = schema.parse(await req.json());

    const comment = await prisma.comment.create({
      data: { content, taskId, authorId: session.user.id },
      include: { author: { select: { id: true, name: true, image: true } } },
    });

    await prisma.taskActivity.create({
      data: { taskId, actorId: session.user.id, type: "COMMENTED", payload: { commentId: comment.id } },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
