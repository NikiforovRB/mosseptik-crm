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

  let funnels: any[] = [];
  try {
    // IMPORTANT: explicit client select (avoid selecting missing columns during partial migrations)
    funnels = await prisma.funnel.findMany({
      orderBy: { name: "asc" },
      include: {
        stages: {
          orderBy: { order: "asc" },
          include: {
            clients: {
              where:
                user.role === "ADMIN"
                  ? { isDealDeleted: false }
                  : { assignedManagerId: user.id, isDealDeleted: false },
              orderBy: { orderInStage: "asc" },
              select: {
                id: true,
                firstName: true,
                lastName: true,
                middleName: true,
                shortComment: true,
                qualified: true,
                moneyProgress: true,
                gsoType: true,
                isUrgent: true,
                lastCommunicationAt: true,
                funnelStageId: true,
                orderInStage: true,
                assignedManagerId: true,
                septicModel: { select: { id: true, name: true } },
                assignedManager: {
                  select: { id: true, firstName: true, lastName: true },
                },
                nextTask: { select: { dueAt: true, dueHasTime: true } },
              },
            },
          },
        },
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "DB error";
    return (
      <div style={{ minHeight: "100vh", background: "#f1f1f1" }}>
        <AppHeader />
        <div style={{ padding: 16 }}>
          <div style={{ fontSize: 14, color: "#111" }}>
            Не удаётся загрузить данные из БД.
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
            Проверьте доступ к PostgreSQL и примените SQL миграции (например, добавление
            колонки phone). Ошибка: {msg}
          </div>
          <div style={{ marginTop: 12, fontSize: 12 }}>
            <a href="/api/health/db" style={{ textDecoration: "underline" }}>
              /api/health/db
            </a>
          </div>
        </div>
      </div>
    );
  }

  const filtered = funnels.filter((f) => {
    const n = f.name.toLowerCase();
    if (selectedSection === "service") return n.includes("сервис");
    return n.includes("монтаж");
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f1f1f1" }}>
      <AppHeader />
      <div
        style={{
          background: "#e5e8ed",
          height: "calc(100vh - 64px)",
          display: "grid",
          gridTemplateRows: "auto 1fr",
        }}
      >
        <HomeTopBar selectedSection={selectedSection} />
        <KanbanBoards initial={filtered as unknown as KanbanFunnel[]} />
      </div>
    </div>
  );
}
