import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const BodySchema = z.object({
  funnelId: z.string().min(1),
  orderedStageIds: z.array(z.string().min(1)).min(1),
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const { funnelId, orderedStageIds } = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.funnelStage.findMany({
        where: { funnelId },
        select: { id: true },
      });
      const existingIds = existing.map((x) => x.id);

      if (existingIds.length !== orderedStageIds.length) {
        throw new Error("invalid_stage_count");
      }
      if (new Set(orderedStageIds).size !== orderedStageIds.length) {
        throw new Error("duplicate_stage_ids");
      }
      const allValid = orderedStageIds.every((id) => existingIds.includes(id));
      if (!allValid) {
        throw new Error("invalid_stage_ids");
      }

      // Shift all orders first to avoid unique constraint conflicts on (funnelId, order).
      await tx.funnelStage.updateMany({
        where: { funnelId },
        data: { order: { increment: 1000 } },
      });

      for (let i = 0; i < orderedStageIds.length; i++) {
        await tx.funnelStage.update({
          where: { id: orderedStageIds[i] },
          data: { order: i + 1 },
        });
      }
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "reorder_failed";
    const status =
      message === "invalid_stage_count" ||
      message === "duplicate_stage_ids" ||
      message === "invalid_stage_ids"
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json({ ok: true });
}

