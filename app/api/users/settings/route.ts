import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  timezone: z.string().min(1),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { timezone } = schema.parse(body);

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { timezone },
      select: { id: true, timezone: true },
    });

    return NextResponse.json(user);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    const message = err instanceof Error ? err.message : String(err);
    console.error("PATCH /api/users/settings error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
