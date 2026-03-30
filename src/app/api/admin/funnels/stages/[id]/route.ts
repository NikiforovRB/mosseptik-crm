import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const PatchSchema = z.object({
  name: z.string().min(1).optional(),
  headerColor: z.string().min(4).max(20).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const updated = await prisma.funnelStage.update({
    where: { id },
    data: {
      ...(parsed.data.name ? { name: parsed.data.name } : {}),
      ...(parsed.data.headerColor ? { headerColor: parsed.data.headerColor } : {}),
    },
    select: { id: true, name: true, order: true, headerColor: true, funnelId: true },
  });

  return NextResponse.json({ stage: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const stage = await prisma.funnelStage.findUnique({
    where: { id },
    select: { id: true, funnelId: true, order: true },
  });
  if (!stage) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const hasClients = await prisma.client.findFirst({
    where: { funnelStageId: id },
    select: { id: true },
  });
  if (hasClients) {
    return NextResponse.json(
      { error: "stage_has_clients", message: "Нельзя удалить этап, пока в нем есть клиенты" },
      { status: 400 }
    );
  }

  const count = await prisma.funnelStage.count({ where: { funnelId: stage.funnelId } });
  if (count <= 1) {
    return NextResponse.json(
      { error: "last_stage", message: "У воронки должен оставаться минимум один этап" },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.funnelStage.delete({ where: { id } });
    await tx.funnelStage.updateMany({
      where: { funnelId: stage.funnelId, order: { gt: stage.order } },
      data: { order: { decrement: 1 } },
    });
  });

  return NextResponse.json({ ok: true });
}

