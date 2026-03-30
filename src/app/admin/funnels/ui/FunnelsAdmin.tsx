"use client";

import { useMemo, useState } from "react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

type Stage = { id: string; name: string; order: number; headerColor: string; funnelId: string };
type Funnel = { id: string; name: string; stages: Stage[] };

export default function FunnelsAdmin({ initial }: { initial: Funnel[] }) {
  const [funnels, setFunnels] = useState<Funnel[]>(initial);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const sorted = useMemo(
    () =>
      funnels.map((f) => ({
        ...f,
        stages: f.stages.slice().sort((a, b) => a.order - b.order),
      })),
    [funnels]
  );

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {sorted.map((funnel) => (
        <div
          key={funnel.id}
          style={{
            background: "#fff",
            border: "1px solid #eee",
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          <div style={{ padding: 12, fontWeight: 900, borderBottom: "1px solid #eee" }}>
            {funnel.name}
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={async (e) => {
              const activeId = String(e.active.id);
              const overId = e.over?.id ? String(e.over.id) : null;
              if (!overId || activeId === overId) return;

              setFunnels((prev) => {
                const next = structuredClone(prev) as Funnel[];
                const ff = next.find((x) => x.id === funnel.id);
                if (!ff) return prev;
                const oldIndex = ff.stages.findIndex((s) => s.id === activeId);
                const newIndex = ff.stages.findIndex((s) => s.id === overId);
                ff.stages = arrayMove(ff.stages, oldIndex, newIndex).map((s, i) => ({
                  ...s,
                  order: i + 1,
                }));
                return next;
              });

              const orderedStageIds = (() => {
                const ff = funnels.find((x) => x.id === funnel.id);
                if (!ff) return [];
                const copy = ff.stages.slice();
                const oldIndex = copy.findIndex((s) => s.id === activeId);
                const newIndex = copy.findIndex((s) => s.id === overId);
                const moved = arrayMove(copy, oldIndex, newIndex);
                return moved.map((s) => s.id);
              })();

              await fetch("/api/admin/funnels/stages/reorder", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ funnelId: funnel.id, orderedStageIds }),
              }).catch(() => {});
            }}
          >
            <SortableContext
              items={funnel.stages.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div style={{ display: "grid" }}>
                {funnel.stages.map((s) => (
                  <StageRow
                    key={s.id}
                    stage={s}
                    onChange={async (patch) => {
                      setFunnels((prev) =>
                        prev.map((ff) =>
                          ff.id !== funnel.id
                            ? ff
                            : {
                                ...ff,
                                stages: ff.stages.map((x) => (x.id === s.id ? { ...x, ...patch } : x)),
                              }
                        )
                      );
                      await fetch(`/api/admin/funnels/stages/${s.id}`, {
                        method: "PATCH",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify(patch),
                      }).catch(() => {});
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      ))}
    </div>
  );
}

function StageRow({
  stage,
  onChange,
}: {
  stage: Stage;
  onChange: (patch: Partial<Pick<Stage, "name" | "headerColor">>) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stage.id,
  });

  const [hex, setHex] = useState(stage.headerColor);
  const isValid = /^#[0-9a-fA-F]{6}$/.test(hex.trim());

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.65 : 1,
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: 10,
        padding: 12,
        borderTop: "1px solid #eee",
        alignItems: "center",
      }}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          border: "1px solid #ededed",
          background: "#fff",
          display: "grid",
          placeItems: "center",
          cursor: "grab",
        }}
        title="Перетащить"
      >
        <GripVertical size={18} />
      </button>

      <input
        value={stage.name}
        onChange={(e) => onChange({ name: e.target.value })}
        style={{
          height: 38,
          borderRadius: 10,
          border: "1px solid #ededed",
          padding: "0 10px",
          outline: "none",
          fontSize: 13,
        }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          value={hex}
          onChange={(e) => setHex(e.target.value)}
          onBlur={() => {
            const v = hex.trim();
            if (v === stage.headerColor) return;
            if (!/^#[0-9a-fA-F]{6}$/.test(v)) {
              setHex(stage.headerColor);
              return;
            }
            onChange({ headerColor: v });
          }}
          placeholder="#000000"
          style={{
            width: 92,
            height: 38,
            borderRadius: 10,
            border: `1px solid ${isValid ? "#ededed" : "#ffd6d6"}`,
            padding: "0 10px",
            outline: "none",
            fontSize: 13,
            fontWeight: 900,
            color: "#111",
          }}
          title="Цвет шапки этапа (#RRGGBB)"
        />
        <div
          title="Предпросмотр"
          style={{
            width: 40,
            height: 34,
            borderRadius: 10,
            border: "1px solid #ededed",
            background: isValid ? hex.trim() : stage.headerColor,
          }}
        />
      </div>
    </div>
  );
}

