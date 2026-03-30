import AppHeader from "@/components/AppHeader";
import { prisma } from "@/lib/prisma";
import SepticsAdmin from "./ui/SepticsAdmin";

export const dynamic = "force-dynamic";

export default async function AdminSepticsPage() {
  const septics = await prisma.septicModel.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa" }}>
      <AppHeader />
      <div style={{ padding: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>Септики</h1>
        <SepticsAdmin initial={septics as any} />
      </div>
    </div>
  );
}

