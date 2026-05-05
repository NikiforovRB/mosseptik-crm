import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

const PatchSchema = z.object({
  name: z.string().trim().min(1).optional(),
  purchasePrice: z.number().int().nonnegative().nullable().optional(),
  salePrice: z.number().int().nonnegative().nullable().optional(),
  imageOriginalKey: z.string().nullable().optional(),
  imageWebpKey: z.string().nullable().optional(),
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

  const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'SepticModel'
  `;
  const colSet = new Set(columns.map((c) => c.column_name));
  const hasPriceAndImageCols =
    colSet.has("purchasePrice") &&
    colSet.has("salePrice") &&
    colSet.has("imageOriginalKey") &&
    colSet.has("imageWebpKey");

  const histTable = await prisma.$queryRaw<Array<{ table_name: string | null }>>`
    SELECT to_regclass('public."SepticPriceHistory"')::text AS table_name
  `;
  const hasHistoryTable = Boolean(histTable[0]?.table_name);

  if (!hasPriceAndImageCols && (parsed.data.purchasePrice !== undefined || parsed.data.salePrice !== undefined || parsed.data.imageWebpKey !== undefined || parsed.data.imageOriginalKey !== undefined)) {
    return NextResponse.json(
      { error: "migration_required", message: "Нужно применить миграцию по ценам/изображениям септиков" },
      { status: 400 }
    );
  }

  let septic: any;
  try {
    septic = await prisma.$transaction(async (tx) => {
    const before = hasPriceAndImageCols
      ? await tx.$queryRaw<Array<{ purchasePrice: number | null; salePrice: number | null }>>`
          SELECT "purchasePrice","salePrice"
          FROM public."SepticModel"
          WHERE "id" = ${id}
          LIMIT 1
        `
      : [{ purchasePrice: null, salePrice: null }];
    if (before.length === 0) throw new Error("not_found");

    if (hasPriceAndImageCols) {
      await tx.$executeRaw`
        UPDATE public."SepticModel"
        SET
          "name" = COALESCE(${parsed.data.name ?? null}, "name"),
          "purchasePrice" = CASE WHEN ${parsed.data.purchasePrice !== undefined} THEN ${parsed.data.purchasePrice ?? null} ELSE "purchasePrice" END,
          "salePrice" = CASE WHEN ${parsed.data.salePrice !== undefined} THEN ${parsed.data.salePrice ?? null} ELSE "salePrice" END,
          "imageOriginalKey" = CASE WHEN ${parsed.data.imageOriginalKey !== undefined} THEN ${parsed.data.imageOriginalKey ?? null} ELSE "imageOriginalKey" END,
          "imageWebpKey" = CASE WHEN ${parsed.data.imageWebpKey !== undefined} THEN ${parsed.data.imageWebpKey ?? null} ELSE "imageWebpKey" END,
          "updatedAt" = NOW()
        WHERE "id" = ${id}
      `;
    } else {
      await tx.$executeRaw`
        UPDATE public."SepticModel"
        SET "name" = COALESCE(${parsed.data.name ?? null}, "name"),
            "updatedAt" = NOW()
        WHERE "id" = ${id}
      `;
    }

    const current = hasPriceAndImageCols
      ? await tx.$queryRaw<
          Array<{
            id: string;
            name: string;
            purchasePrice: number | null;
            salePrice: number | null;
            imageOriginalKey: string | null;
            imageWebpKey: string | null;
          }>
        >`
          SELECT "id","name","purchasePrice","salePrice","imageOriginalKey","imageWebpKey"
          FROM public."SepticModel"
          WHERE "id" = ${id}
          LIMIT 1
        `
      : await tx.$queryRaw<Array<{ id: string; name: string }>>`
          SELECT "id","name"
          FROM public."SepticModel"
          WHERE "id" = ${id}
          LIMIT 1
        `;
    if (current.length === 0) throw new Error("not_found");

    const prev = before[0];
    const next = current[0];
    const nextPurchasePrice = "purchasePrice" in next ? next.purchasePrice : null;
    const nextSalePrice = "salePrice" in next ? next.salePrice : null;
    if (
      hasHistoryTable &&
      hasPriceAndImageCols &&
      parsed.data.purchasePrice !== undefined &&
      prev.purchasePrice !== nextPurchasePrice &&
      nextPurchasePrice !== null
    ) {
      await tx.$executeRaw`
        INSERT INTO public."SepticPriceHistory" ("id","septicModelId","kind","price","createdAt")
        VALUES (${randomUUID()}, ${id}, 'PURCHASE'::public."SepticPriceKind", ${nextPurchasePrice}, NOW())
      `;
    }
    if (
      hasHistoryTable &&
      hasPriceAndImageCols &&
      parsed.data.salePrice !== undefined &&
      prev.salePrice !== nextSalePrice &&
      nextSalePrice !== null
    ) {
      await tx.$executeRaw`
        INSERT INTO public."SepticPriceHistory" ("id","septicModelId","kind","price","createdAt")
        VALUES (${randomUUID()}, ${id}, 'SALE'::public."SepticPriceKind", ${nextSalePrice}, NOW())
      `;
    }

    const history = hasHistoryTable
      ? await tx.$queryRaw<
          Array<{ id: string; kind: "PURCHASE" | "SALE"; price: number; createdAt: Date }>
        >`
          SELECT "id","kind","price","createdAt"
          FROM public."SepticPriceHistory"
          WHERE "septicModelId" = ${id}
          ORDER BY "createdAt" DESC
        `
      : [];

    return {
      ...next,
      purchasePrice: "purchasePrice" in next ? next.purchasePrice : null,
      salePrice: "salePrice" in next ? next.salePrice : null,
      imageOriginalKey: "imageOriginalKey" in next ? next.imageOriginalKey : null,
      imageWebpKey: "imageWebpKey" in next ? next.imageWebpKey : null,
      priceHistoryItems: history.map((h) => ({ ...h, createdAt: h.createdAt.toISOString() })),
    };
    });
  } catch (e) {
    if (e instanceof Error && e.message === "not_found") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    throw e;
  }

  return NextResponse.json({ septic });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  await prisma.$executeRaw`DELETE FROM public."SepticModel" WHERE "id" = ${id}`;
  return NextResponse.json({ ok: true });
}

