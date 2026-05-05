import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const PatchSchema = z.object({
  price: z.number().int().nonnegative(),
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

  const rows = await prisma.$queryRaw<
    Array<{ id: string; kind: "PURCHASE" | "SALE"; price: number; createdAt: Date }>
  >`
    UPDATE public."SepticPriceHistory"
    SET "price" = ${parsed.data.price}
    WHERE "id" = ${id}
    RETURNING "id","kind","price","createdAt"
  `;
  if (rows.length === 0) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({
    item: {
      ...rows[0],
      createdAt: rows[0].createdAt.toISOString(),
    },
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  await prisma.$executeRaw`
    DELETE FROM public."SepticPriceHistory"
    WHERE "id" = ${id}
  `;
  return NextResponse.json({ ok: true });
}
