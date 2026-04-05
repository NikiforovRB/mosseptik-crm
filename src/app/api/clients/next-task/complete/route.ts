import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/serverAuth";

const BodySchema = z.object({
  clientId: z.string().min(1),
  resultText: z.string().min(1).max(20000),
});

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const { clientId, resultText } = parsed.data;

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, assignedManagerId: true, isDealDeleted: true },
  });
  if (!client) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (client.isDealDeleted) return NextResponse.json({ error: "deal_deleted" }, { status: 400 });
  if (auth.user.role !== "ADMIN" && client.assignedManagerId !== auth.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const task = await prisma.clientNextTask.findUnique({
    where: { clientId },
    include: { assignee: { select: { firstName: true, lastName: true } } },
  });
  if (!task) return NextResponse.json({ error: "no_task" }, { status: 400 });

  const assigneeName = `${task.assignee.firstName} ${task.assignee.lastName}`.trim();
  const now = new Date();
  const communication = await prisma.$transaction(async (tx) => {
    const created = await tx.communication.create({
      data: {
        clientId,
        authorId: auth.user.id,
        kind: "TASK_COMPLETED",
        taskAssigneeLabel: assigneeName,
        text: resultText.trim(),
        communicationDate: now,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, role: true } },
        photos: { select: { id: true, originalKey: true, webpKey: true, createdAt: true } },
      },
    });
    await tx.clientNextTask.delete({ where: { clientId } });
    await tx.client.update({
      where: { id: clientId },
      data: { lastCommunicationAt: now },
    });
    return created;
  });

  return NextResponse.json({
    communication: {
      ...communication,
      createdAt: communication.createdAt.toISOString(),
      communicationDate: communication.communicationDate.toISOString(),
      photos: communication.photos.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
      })),
    },
  });
}
