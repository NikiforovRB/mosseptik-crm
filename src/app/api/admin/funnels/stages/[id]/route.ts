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

