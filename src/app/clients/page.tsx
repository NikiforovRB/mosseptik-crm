import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { getSessionUser } from "@/lib/serverAuth";
import { prisma } from "@/lib/prisma";
import ClientsTableClient from "./ui/ClientsTableClient";

export const dynamic = "force-dynamic";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ managerId?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { managerId } = await searchParams;

  const managers = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "MANAGER"] } },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    select: { id: true, firstName: true, lastName: true, role: true },
  });

  const canFilter = user.role === "ADMIN";
  const effectiveManagerId = canFilter ? managerId || "" : user.id;

  const clients = await prisma.client.findMany({
    where: {
      ...(effectiveManagerId ? { assignedManagerId: effectiveManagerId } : {}),
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      assignedManager: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f1f1f1" }}>
      <AppHeader />
      <div style={{ padding: 16, display: "grid", gap: 12 }}>
        <div style={{ fontSize: 18 }}>Клиенты</div>
        <ClientsTableClient
          canFilter={canFilter}
          managers={managers as any}
          effectiveManagerId={effectiveManagerId}
          clients={clients as any}
        />
      </div>
    </div>
  );
}

