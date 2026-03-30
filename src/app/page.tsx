import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import KanbanBoards from "@/components/kanban/KanbanBoards";
import type { KanbanFunnel } from "@/components/kanban/types";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/serverAuth";
import HomeTopBar from "@/components/home/HomeTopBar";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { section } = await searchParams;
  const selectedSection =
    section === "service" || section === "montazh" ? section : "montazh";

  const funnels = await prisma.funnel.findMany({
    orderBy: { name: "asc" },
    include: {
      stages: {
        orderBy: { order: "asc" },
        include: {
          clients: {
            where:
              user.role === "ADMIN"
                ? {}
                : { assignedManagerId: user.id },
            orderBy: { orderInStage: "asc" },
            include: {
              septicModel: { select: { id: true, name: true } },
              assignedManager: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
        },
      },
    },
  });

  const filtered = funnels.filter((f) => {
    const n = f.name.toLowerCase();
    if (selectedSection === "service") return n.includes("сервис");
    return n.includes("монтаж");
  });

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa" }}>
      <AppHeader />
      <HomeTopBar selectedSection={selectedSection} />
      <KanbanBoards initial={filtered as unknown as KanbanFunnel[]} />
    </div>
  );
}
