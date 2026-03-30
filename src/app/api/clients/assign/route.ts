import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/serverAuth";

const BodySchema = z.object({
  clientId: z.string().min(1),
  assignedManagerId: z.string().min(1).nullable(),
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const { clientId, assignedManagerId } = parsed.data;

  const updated = await prisma.client.update({
    where: { id: clientId },
    data: { assignedManagerId },
    include: {
      assignedManager: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  return NextResponse.json({
    assignedManagerId: updated.assignedManagerId,
    assignedManager: updated.assignedManager,
  });
}

