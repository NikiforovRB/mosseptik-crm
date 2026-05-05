import AppHeader from "@/components/AppHeader";
import { prisma } from "@/lib/prisma";
import SepticsAdmin from "./ui/SepticsAdmin";

export const dynamic = "force-dynamic";

export default async function AdminSepticsPage() {
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

  const septicsBase = hasPriceAndImageCols
    ? await prisma.$queryRaw<
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
        ORDER BY "name" ASC
      `
    : await prisma.$queryRaw<
        Array<{
          id: string;
          name: string;
        }>
      >`
        SELECT "id","name"
        FROM public."SepticModel"
        ORDER BY "name" ASC
      `;

  const history = hasHistoryTable
    ? await prisma.$queryRaw<
        Array<{
          id: string;
          septicModelId: string;
          kind: "PURCHASE" | "SALE";
          price: number;
          createdAt: Date;
        }>
      >`
        SELECT "id","septicModelId","kind","price","createdAt"
        FROM public."SepticPriceHistory"
        ORDER BY "createdAt" DESC
      `
    : [];

  const bySeptic = new Map<string, Array<{ id: string; kind: "PURCHASE" | "SALE"; price: number; createdAt: string }>>();
  for (const h of history) {
    const list = bySeptic.get(h.septicModelId) ?? [];
    list.push({ id: h.id, kind: h.kind, price: h.price, createdAt: h.createdAt.toISOString() });
    bySeptic.set(h.septicModelId, list);
  }
  const septics = septicsBase.map((s) => ({
    ...s,
    purchasePrice: "purchasePrice" in s ? s.purchasePrice : null,
    salePrice: "salePrice" in s ? s.salePrice : null,
    imageOriginalKey: "imageOriginalKey" in s ? s.imageOriginalKey : null,
    imageWebpKey: "imageWebpKey" in s ? s.imageWebpKey : null,
    priceHistoryItems: bySeptic.get(s.id) ?? [],
  }));

  return (
    <div style={{ minHeight: "100vh", background: "#fff" }}>
      <AppHeader />
      <div style={{ padding: 16 }}>
        <SepticsAdmin initial={septics as any} />
      </div>
    </div>
  );
}

