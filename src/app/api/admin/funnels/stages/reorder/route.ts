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

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < orderedStageIds.length; i++) {
      await tx.funnelStage.update({
        where: { id: orderedStageIds[i] },
        data: { order: i + 1, funnelId },
      });
    }
  });

  return NextResponse.json({ ok: true });
}

