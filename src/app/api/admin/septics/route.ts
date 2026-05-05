import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

const CreateSchema = z.object({
  name: z.string().trim().min(1),
  purchasePrice: z.number().int().nonnegative().nullable().optional(),
  salePrice: z.number().int().nonnegative().nullable().optional(),
  imageOriginalKey: z.string().nullable().optional(),
  imageWebpKey: z.string().nullable().optional(),
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = CreateSchema.safeParse(await req.json().catch(() => null));
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

  if (!hasPriceAndImageCols && (parsed.data.purchasePrice !== undefined || parsed.data.salePrice !== undefined || parsed.data.imageWebpKey || parsed.data.imageOriginalKey)) {
    return NextResponse.json(
      { error: "migration_required", message: "Нужно применить миграцию по ценам/изображениям септиков" },
      { status: 400 }
    );
  }

  const septic = await prisma.$transaction(async (tx) => {
    const id = randomUUID();
    if (hasPriceAndImageCols) {
      await tx.$executeRaw`
        INSERT INTO public."SepticModel"
        ("id","name","purchasePrice","salePrice","imageOriginalKey","imageWebpKey","createdAt","updatedAt")
        VALUES
        (${id}, ${parsed.data.name}, ${parsed.data.purchasePrice ?? null}, ${parsed.data.salePrice ?? null},
         ${parsed.data.imageOriginalKey ?? null}, ${parsed.data.imageWebpKey ?? null}, NOW(), NOW())
      `;
    } else {
      await tx.$executeRaw`
        INSERT INTO public."SepticModel"
        ("id","name","createdAt","updatedAt")
        VALUES (${id}, ${parsed.data.name}, NOW(), NOW())
      `;
    }

    if (hasHistoryTable && parsed.data.purchasePrice !== null && parsed.data.purchasePrice !== undefined) {
      await tx.$executeRaw`
        INSERT INTO public."SepticPriceHistory" ("id","septicModelId","kind","price","createdAt")
        VALUES (${randomUUID()}, ${id}, 'PURCHASE'::public."SepticPriceKind", ${parsed.data.purchasePrice}, NOW())
      `;
    }
    if (hasHistoryTable && parsed.data.salePrice !== null && parsed.data.salePrice !== undefined) {
      await tx.$executeRaw`
        INSERT INTO public."SepticPriceHistory" ("id","septicModelId","kind","price","createdAt")
        VALUES (${randomUUID()}, ${id}, 'SALE'::public."SepticPriceKind", ${parsed.data.salePrice}, NOW())
      `;
    }

    const rows = hasPriceAndImageCols
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
      : await tx.$queryRaw<
          Array<{
            id: string;
            name: string;
          }>
        >`
          SELECT "id","name"
          FROM public."SepticModel"
          WHERE "id" = ${id}
          LIMIT 1
        `;

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
      ...rows[0],
      purchasePrice: "purchasePrice" in rows[0] ? rows[0].purchasePrice : null,
      salePrice: "salePrice" in rows[0] ? rows[0].salePrice : null,
      imageOriginalKey: "imageOriginalKey" in rows[0] ? rows[0].imageOriginalKey : null,
      imageWebpKey: "imageWebpKey" in rows[0] ? rows[0].imageWebpKey : null,
      priceHistoryItems: history.map((h) => ({ ...h, createdAt: h.createdAt.toISOString() })),
    };
  });

  return NextResponse.json({ septic });
}

