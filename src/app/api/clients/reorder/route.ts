import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/serverAuth";

const BodySchema = z.object({
  fromStageId: z.string().min(1),
  toStageId: z.string().min(1),
  fromOrderedClientIds: z.array(z.string().min(1)),
  toOrderedClientIds: z.array(z.string().min(1)),
});

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const role = auth.user.role;
  const userId = auth.user.id;

  const { fromStageId, toStageId, fromOrderedClientIds, toOrderedClientIds } =
    parsed.data;

  const allIds = [...new Set([...fromOrderedClientIds, ...toOrderedClientIds])];
  const clients = await prisma.client.findMany({
    where: { id: { in: allIds } },
    select: { id: true, assignedManagerId: true },
  });

  if (role !== "ADMIN") {
    for (const c of clients) {
      if (c.assignedManagerId !== userId) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < fromOrderedClientIds.length; i++) {
      await tx.client.update({
        where: { id: fromOrderedClientIds[i] },
        data: { funnelStageId: fromStageId, orderInStage: i },
      });
    }
    for (let i = 0; i < toOrderedClientIds.length; i++) {
      await tx.client.update({
        where: { id: toOrderedClientIds[i] },
        data: { funnelStageId: toStageId, orderInStage: i },
      });
    }
  });

  return NextResponse.json({ ok: true });
}

