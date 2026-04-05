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
        select: {
          id: true,
          name: true,
          funnelId: true,
          headerColor: true,
          funnel: { select: { name: true } },
        },
      },
      nextTask: {
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true } },
        },
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
  if (client.isDealDeleted) {
    redirect("/clients");
  }

  if (user.role !== "ADMIN" && client.assignedManagerId !== user.id) {
    redirect("/");
  }

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true, role: true },
  });

  const septicModels = await prisma.septicModel.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const funnelStageOptions = await prisma.funnelStage.findMany({
    select: {
      id: true,
      name: true,
      headerColor: true,
      funnel: { select: { name: true } },
    },
    orderBy: [{ funnel: { name: "asc" } }, { order: "asc" }],
  });

  const clientPlain = {
    ...client,
    nextTask: client.nextTask
      ? {
          id: client.nextTask.id,
          dueAt: client.nextTask.dueAt ? client.nextTask.dueAt.toISOString() : null,
          dueHasTime: client.nextTask.dueHasTime,
          assigneeId: client.nextTask.assigneeId,
          assignee: client.nextTask.assignee,
        }
      : null,
    communications: client.communications.map((m) => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
      communicationDate: m.communicationDate.toISOString(),
      photos: m.photos.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
      })),
    })),
  };

  return (
    <div style={{ minHeight: "100vh", background: "#fff" }}>
      <AppHeader />
      <ClientDetail
        client={clientPlain as any}
        users={users as any}
        septicModels={septicModels as any}
        funnelStageOptions={funnelStageOptions.map((s) => ({
          id: s.id,
          name: s.name,
          headerColor: s.headerColor || "#ccd0e1",
          funnelName: s.funnel.name,
        }))}
        canReassign={user.role === "ADMIN"}
        currentUserId={user.id}
      />
    </div>
  );
}

