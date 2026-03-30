import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/serverAuth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;

  const hasClients = await prisma.client.findFirst({
    where: { funnelStage: { funnelId: id } },
    select: { id: true },
  });
  if (hasClients) {
    return NextResponse.json(
      { error: "funnel_has_clients", message: "Нельзя удалить воронку, пока в ней есть клиенты" },
      { status: 400 }
    );
  }

  await prisma.funnel.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

