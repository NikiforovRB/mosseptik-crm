import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/serverAuth";

const BodySchema = z.object({
  clientId: z.string().min(1),
  requisites: z.string().max(20000),
});

/**
 * Saves deal requisites only. Uses $executeRaw so it works even if the generated
 * Prisma Client was not regenerated after adding the `requisites` column (update()
 * would reject an unknown field until `npx prisma generate`).
 */
export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const { clientId, requisites } = parsed.data;

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, assignedManagerId: true, isDealDeleted: true },
  });
  if (!client) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (client.isDealDeleted) {
    return NextResponse.json({ error: "deal_deleted" }, { status: 400 });
  }
  if (auth.user.role !== "ADMIN" && client.assignedManagerId !== auth.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const now = new Date();
    await prisma.$executeRaw`
      UPDATE public."Client"
      SET "requisites" = ${requisites},
          "updatedAt" = ${now}
      WHERE "id" = ${clientId}
    `;
  } catch (e) {
    console.error("[api/clients/requisites]", e);
    return NextResponse.json(
      {
        error: "update_failed",
        message: e instanceof Error ? e.message : "unknown",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
