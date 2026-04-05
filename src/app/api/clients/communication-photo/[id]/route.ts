import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/serverAuth";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: photoId } = await ctx.params;

  const photo = await prisma.communicationPhoto.findUnique({
    where: { id: photoId },
    include: {
      communication: {
        include: { client: { select: { assignedManagerId: true, isDealDeleted: true } } },
      },
    },
  });
  if (!photo) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (photo.communication.client.isDealDeleted) {
    return NextResponse.json({ error: "deal_deleted" }, { status: 400 });
  }
  if (auth.user.role !== "ADMIN" && photo.communication.client.assignedManagerId !== auth.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await prisma.communicationPhoto.delete({ where: { id: photoId } });

  return NextResponse.json({ ok: true });
}
