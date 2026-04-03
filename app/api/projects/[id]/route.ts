import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateProjectSchema = z.object({
  name: z.string().min(1).max(255),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const body = await req.json();
    const { name } = updateProjectSchema.parse(body);

    // Verify the user is a member of the project's org
    const project = await prisma.project.findUnique({
      where: { id },
      select: { organizationId: true },
    });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const membership = await prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId: session.user.id, organizationId: project.organizationId } },
    });
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const updated = await prisma.project.update({ where: { id }, data: { name } });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
