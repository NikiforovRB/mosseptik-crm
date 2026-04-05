import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/serverAuth";

const PatchSchema = z.object({
  text: z.string().max(20000).optional(),
  communicationDate: z.string().datetime().optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: communicationId } = await ctx.params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const existing = await prisma.communication.findUnique({
    where: { id: communicationId },
    include: { client: { select: { assignedManagerId: true, isDealDeleted: true } } },
  });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (existing.client.isDealDeleted) {
    return NextResponse.json({ error: "deal_deleted" }, { status: 400 });
  }
  if (auth.user.role !== "ADMIN" && existing.client.assignedManagerId !== auth.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { text, communicationDate } = parsed.data;
  if (text === undefined && communicationDate === undefined) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  let nextDate = existing.communicationDate;
  if (communicationDate !== undefined) {
    nextDate = new Date(communicationDate);
    if (Number.isNaN(nextDate.getTime())) {
      return NextResponse.json({ error: "bad_date" }, { status: 400 });
    }
    if (nextDate.getTime() > Date.now()) {
      return NextResponse.json({ error: "future_date" }, { status: 400 });
    }
  }

  const updated = await prisma.communication.update({
    where: { id: communicationId },
    data: {
      ...(text !== undefined ? { text } : {}),
      ...(communicationDate !== undefined ? { communicationDate: nextDate } : {}),
    },
    include: {
      author: { select: { id: true, firstName: true, lastName: true, role: true } },
      photos: { select: { id: true, originalKey: true, webpKey: true, createdAt: true } },
    },
  });

  const last = await prisma.communication.findFirst({
    where: { clientId: existing.clientId },
    orderBy: { communicationDate: "desc" },
    select: { communicationDate: true },
  });
  if (last) {
    await prisma.client.update({
      where: { id: existing.clientId },
      data: { lastCommunicationAt: last.communicationDate },
    });
  }

  return NextResponse.json({
    communication: {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      communicationDate: updated.communicationDate.toISOString(),
      photos: updated.photos.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
      })),
    },
  });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: communicationId } = await ctx.params;

  const existing = await prisma.communication.findUnique({
    where: { id: communicationId },
    include: { client: { select: { id: true, assignedManagerId: true, isDealDeleted: true } } },
  });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (existing.client.isDealDeleted) {
    return NextResponse.json({ error: "deal_deleted" }, { status: 400 });
  }
  if (auth.user.role !== "ADMIN" && existing.client.assignedManagerId !== auth.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const clientId = existing.clientId;
  await prisma.communication.delete({ where: { id: communicationId } });

  const last = await prisma.communication.findFirst({
    where: { clientId },
    orderBy: { communicationDate: "desc" },
    select: { communicationDate: true },
  });
  await prisma.client.update({
    where: { id: clientId },
    data: { lastCommunicationAt: last?.communicationDate ?? null },
  });

  return NextResponse.json({ ok: true });
}
