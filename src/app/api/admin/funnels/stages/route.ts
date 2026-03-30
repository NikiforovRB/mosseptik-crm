import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const BodySchema = z.object({
  funnelId: z.string().min(1),
  name: z.string().min(1).max(80),
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const { funnelId, name } = parsed.data;

  const last = await prisma.funnelStage.findFirst({
    where: { funnelId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const created = await prisma.funnelStage.create({
    data: {
      funnelId,
      name: name.trim(),
      order: (last?.order ?? 0) + 1,
      headerColor: "#ccd0e1",
    },
    select: { id: true, name: true, order: true, headerColor: true, funnelId: true },
  });

  return NextResponse.json({ stage: created });
}

