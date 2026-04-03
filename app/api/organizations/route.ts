import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createOrgSchema } from "@/lib/validations/organization";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberships = await prisma.organizationMember.findMany({
    where: { userId: session.user.id },
    include: { organization: { include: { projects: true } } },
  });

  return NextResponse.json(memberships.map((m) => ({ ...m.organization, role: m.role })));
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { name, slug } = createOrgSchema.parse(body);

    const existing = await prisma.organization.findUnique({ where: { slug } });
    if (existing) return NextResponse.json({ error: "Slug already taken." }, { status: 409 });

    const org = await prisma.organization.create({
      data: {
        name,
        slug,
        members: {
          create: { userId: session.user.id, role: "OWNER" },
        },
      },
    });

    return NextResponse.json(org, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
