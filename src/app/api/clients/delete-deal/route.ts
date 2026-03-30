import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/serverAuth";

const BodySchema = z.object({
  clientId: z.string().min(1),
});

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const { clientId } = parsed.data;

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, assignedManagerId: true, isDealDeleted: true },
  });
  if (!client) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (client.isDealDeleted) return NextResponse.json({ ok: true });

  if (auth.user.role !== "ADMIN" && client.assignedManagerId !== auth.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.communication.deleteMany({ where: { clientId } });
    await tx.client.update({
      where: { id: clientId },
      data: {
        isDealDeleted: true,
        shortComment: "",
        septicModelId: null,
        assignedManagerId: null,
      },
    });
  });

  return NextResponse.json({ ok: true });
}

