import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AppHeader from "@/components/AppHeader";
import ClientDetail from "./ui/ClientDetail";
import { getSessionUser } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export default async function ClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      septicModel: { select: { id: true, name: true } },
      // phone included by default
      assignedManager: { select: { id: true, firstName: true, lastName: true } },
      funnelStage: {
        select: { id: true, name: true, funnelId: true, funnel: { select: { name: true } } },
      },
      communications: {
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { id: true, firstName: true, lastName: true, role: true } },
          photos: { select: { id: true, originalKey: true, webpKey: true, createdAt: true } },
        },
      },
    },
  });
  if (!client) notFound();

  if (user.role !== "ADMIN" && client.assignedManagerId !== user.id) {
    redirect("/");
  }

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true, role: true },
  });

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa" }}>
      <AppHeader />
      <ClientDetail
        client={client as any}
        users={users as any}
        canReassign={user.role === "ADMIN"}
      />
    </div>
  );
}

