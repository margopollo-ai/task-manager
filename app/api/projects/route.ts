import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createProjectSchema } from "@/lib/validations/project";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { name, key, description, organizationId } = createProjectSchema.parse(body);

    // Verify user is a member of the org
    const membership = await prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId: session.user.id, organizationId } },
    });
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const project = await prisma.project.create({
      data: { name, key, description, organizationId, createdById: session.user.id },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
