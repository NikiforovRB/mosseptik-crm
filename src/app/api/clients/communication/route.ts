import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/serverAuth";

const BodySchema = z.object({
  clientId: z.string().min(1),
  text: z.string().default(""),
  communicationDate: z.string().datetime(),
  photos: z
    .array(
      z.object({
        originalKey: z.string().min(1),
        webpKey: z.string().min(1),
      })
    )
    .default([]),
});

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const role = auth.user.role;
  const userId = auth.user.id;

  const { clientId, text, communicationDate, photos } = parsed.data;

  const commDate = new Date(communicationDate);
  if (Number.isNaN(commDate.getTime())) {
    return NextResponse.json({ error: "bad_date" }, { status: 400 });
  }
  if (commDate.getTime() > Date.now()) {
    return NextResponse.json({ error: "future_date" }, { status: 400 });
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, assignedManagerId: true, isDealDeleted: true },
  });
  if (!client) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (client.isDealDeleted) {
    return NextResponse.json({ error: "deal_deleted" }, { status: 400 });
  }

  if (role !== "ADMIN" && client.assignedManagerId !== userId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const created = await prisma.$transaction(async (tx) => {
    const communication = await tx.communication.create({
      data: {
        clientId,
        authorId: userId,
        kind: "STANDARD",
        text,
        communicationDate: commDate,
        photos: {
          create: photos.map((p) => ({
            originalKey: p.originalKey,
            webpKey: p.webpKey,
          })),
        },
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, role: true } },
        photos: { select: { id: true, originalKey: true, webpKey: true, createdAt: true } },
      },
    });

    await tx.client.update({
      where: { id: clientId },
      data: { lastCommunicationAt: commDate },
    });

    return communication;
  });

  return NextResponse.json({ communication: created });
}

