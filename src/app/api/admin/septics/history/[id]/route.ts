import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const PatchSchema = z
  .object({
    price: z.number().int().nonnegative().optional(),
    createdAt: z.string().datetime().optional(),
  })
  .refine((d) => d.price !== undefined || d.createdAt !== undefined, {
    message: "no_changes",
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

  const priceProvided = parsed.data.price !== undefined;
  const dateProvided = parsed.data.createdAt !== undefined;
  const priceVal = parsed.data.price ?? 0;
  const dateVal = parsed.data.createdAt ? new Date(parsed.data.createdAt) : new Date(0);

  const rows = await prisma.$queryRaw<
    Array<{ id: string; kind: "PURCHASE" | "SALE"; price: number; createdAt: Date }>
  >`
    UPDATE public."SepticPriceHistory"
    SET
      "price" = CASE WHEN ${priceProvided} THEN ${priceVal} ELSE "price" END,
      "createdAt" = CASE WHEN ${dateProvided} THEN ${dateVal}::timestamptz ELSE "createdAt" END
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
