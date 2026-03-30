"use client";

import type { KanbanFunnel } from "./types";
import { useMemo, useState } from "react";
import {
  closestCorners,
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import KanbanStageColumn from "./KanbanStageColumn";
import KanbanCardOverlay from "./KanbanCardOverlay";

type CardId = { type: "card"; id: string };
type StageId = { type: "stage"; id: string };

function toCardId(id: string): string {
  return `card:${id}`;
}
function toStageId(id: string): string {
  return `stage:${id}`;
}
function parseId(raw: string): CardId | StageId | null {
  if (raw.startsWith("card:")) return { type: "card", id: raw.slice(5) };
  if (raw.startsWith("stage:")) return { type: "stage", id: raw.slice(6) };
  return null;
}

export default function KanbanBoards({ initial }: { initial: KanbanFunnel[] }) {
  const [funnels, setFunnels] = useState<KanbanFunnel[]>(initial);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const stageById = useMemo(() => {
    const map = new Map<string, { funnelId: string; stageIdx: number }>();
    funnels.forEach((f) => {
      f.stages.forEach((s, idx) => map.set(s.id, { funnelId: f.id, stageIdx: idx }));
    });
    return map;
  }, [funnels]);

  function findCard(cardId: string) {
    for (const f of funnels) {
      for (const s of f.stages) {
        const idx = s.clients.findIndex((c) => c.id === cardId);
        if (idx !== -1) return { funnelId: f.id, stageId: s.id, index: idx };
      }
    }
    return null;
  }

  function reorderInState(
    args:
      | { kind: "sameStage"; stageId: string; from: number; to: number }
      | { kind: "moveStage"; fromStageId: string; toStageId: string; from: number; to: number }
  ) {
    setFunnels((prev) => {
      const next = structuredClone(prev) as KanbanFunnel[];

      const getStage = (stageId: string) => {
        for (const f of next) {
          const s = f.stages.find((x) => x.id === stageId);
          if (s) return s;
        }
        return null;
      };

      if (args.kind === "sameStage") {
        const stage = getStage(args.stageId);
        if (!stage) return prev;
        stage.clients = arrayMove(stage.clients, args.from, args.to);
        stage.clients.forEach((c, i) => (c.orderInStage = i));
        return next;
      }

      const fromStage = getStage(args.fromStageId);
      const toStage = getStage(args.toStageId);
      if (!fromStage || !toStage) return prev;

      const [moved] = fromStage.clients.splice(args.from, 1);
      moved.funnelStageId = toStage.id;
      toStage.clients.splice(args.to, 0, moved);

      fromStage.clients.forEach((c, i) => (c.orderInStage = i));
      toStage.clients.forEach((c, i) => (c.orderInStage = i));

      return next;
    });
  }

  async function persistReorder(fromStageId: string, toStageId: string) {
    const payload = (() => {
      const fromStage = funnels.flatMap((f) => f.stages).find((s) => s.id === fromStageId);
      const toStage = funnels.flatMap((f) => f.stages).find((s) => s.id === toStageId);
      if (!fromStage || !toStage) return null;
      return {
        fromStageId,
        toStageId,
        fromOrderedClientIds: fromStage.clients.map((c) => c.id),
        toOrderedClientIds: toStage.clients.map((c) => c.id),
      };
    })();
    if (!payload) return;

    await fetch("/api/clients/reorder", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  return (
    <div style={{ display: "grid", gap: 18, padding: 16 }}>
      {funnels.map((f) => (
        <section key={f.id} style={{ display: "grid", gap: 10 }}>
          <div style={{ fontWeight: 900, fontSize: 16, color: "#000000" }}>
            {f.name}
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={(e: DragStartEvent) => {
              const parsed = e.active?.id ? parseId(String(e.active.id)) : null;
              if (parsed?.type === "card") setActiveCardId(parsed.id);
            }}
            onDragOver={(e: DragOverEvent) => {
              const active = parseId(String(e.active.id));
              const over = e.over?.id ? parseId(String(e.over.id)) : null;
              if (!active || active.type !== "card" || !over) return;

              const from = findCard(active.id);
              if (!from) return;

              if (over.type === "stage") {
                if (from.stageId === over.id) return;
                reorderInState({
                  kind: "moveStage",
                  fromStageId: from.stageId,
                  toStageId: over.id,
                  from: from.index,
                  to: 0,
                });
              } else if (over.type === "card") {
                const to = findCard(over.id);
                if (!to) return;

                if (from.stageId === to.stageId) {
                  if (from.index === to.index) return;
                  reorderInState({
                    kind: "sameStage",
                    stageId: from.stageId,
                    from: from.index,
                    to: to.index,
                  });
                } else {
                  reorderInState({
                    kind: "moveStage",
                    fromStageId: from.stageId,
                    toStageId: to.stageId,
                    from: from.index,
                    to: to.index,
                  });
                }
              }
            }}
            onDragEnd={async (e: DragEndEvent) => {
              const active = parseId(String(e.active.id));
              const over = e.over?.id ? parseId(String(e.over.id)) : null;
              setActiveCardId(null);
              if (!active || active.type !== "card" || !over) return;

              const from = findCard(active.id);
              if (!from) return;

              const toStageId =
                over.type === "stage"
                  ? over.id
                  : over.type === "card"
                    ? findCard(over.id)?.stageId ?? null
                    : null;
              if (!toStageId) return;

              if (from.stageId !== toStageId) {
                await persistReorder(from.stageId, toStageId).catch(() => {});
              } else {
                await persistReorder(from.stageId, toStageId).catch(() => {});
              }
            }}
          >
            <SortableContext
              items={f.stages.map((s) => toStageId(s.id))}
              strategy={horizontalListSortingStrategy}
            >
              <div
                style={{
                  display: "grid",
                  gridAutoFlow: "column",
                  gridAutoColumns: "minmax(280px, 1fr)",
                  gap: 12,
                  overflowX: "auto",
                  paddingBottom: 8,
                }}
              >
                {f.stages
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .map((s) => (
                    <SortableContext
                      key={s.id}
                      items={s.clients
                        .slice()
                        .sort((a, b) => a.orderInStage - b.orderInStage)
                        .map((c) => toCardId(c.id))}
                      strategy={rectSortingStrategy}
                    >
                      <KanbanStageColumn stage={s} stageDndId={toStageId(s.id)} />
                    </SortableContext>
                  ))}
              </div>
            </SortableContext>

            <KanbanCardOverlay
              funnels={funnels}
              activeCardId={activeCardId}
              toCardDndId={toCardId}
            />
          </DndContext>
        </section>
      ))}
    </div>
  );
}

