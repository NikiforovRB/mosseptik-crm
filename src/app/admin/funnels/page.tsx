import AppHeader from "@/components/AppHeader";
import { prisma } from "@/lib/prisma";
import FunnelsAdmin from "./ui/FunnelsAdmin";

export const dynamic = "force-dynamic";

export default async function AdminFunnelsPage() {
  const funnels = await prisma.funnel.findMany({
    orderBy: { name: "asc" },
    include: { stages: { orderBy: { order: "asc" } } },
  });

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa" }}>
      <AppHeader />
      <div style={{ padding: 16 }}>
        <FunnelsAdmin initial={funnels as any} />
      </div>
    </div>
  );
}

