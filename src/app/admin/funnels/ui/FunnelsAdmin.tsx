"use client";

import { useMemo, useState } from "react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";

type Stage = { id: string; name: string; order: number; headerColor: string; funnelId: string };
type Funnel = { id: string; name: string; stages: Stage[] };

export default function FunnelsAdmin({ initial }: { initial: Funnel[] }) {
  const [baseline, setBaseline] = useState<Funnel[]>(initial);
  const [funnels, setFunnels] = useState<Funnel[]>(initial);
  const [newFunnelName, setNewFunnelName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveHover, setSaveHover] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const isDirty = JSON.stringify(funnels) !== JSON.stringify(baseline);

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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <h1 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>Воронки</h1>
        <button
          type="button"
          disabled={!isDirty || isSaving}
          onMouseEnter={() => setSaveHover(true)}
          onMouseLeave={() => setSaveHover(false)}
          onClick={async () => {
            if (!isDirty || isSaving) return;
            setIsSaving(true);
            try {
              let next = structuredClone(funnels) as Funnel[];
              const createdFunnelsById = new Map<string, Funnel>();

              for (const f of next) {
                if (!f.id.startsWith("tmp-funnel-")) continue;
                const res = await fetch("/api/admin/funnels", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ name: f.name }),
                });
                const json = await res.json().catch(() => null);
                if (!res.ok) throw new Error(json?.message ?? "Не удалось создать воронку");
                const created = json.funnel as Funnel;
                createdFunnelsById.set(created.id, created);

                const oldId = f.id;
                f.id = created.id;
                if (f.stages[0]?.id?.startsWith("tmp-stage-") && created.stages[0]) {
                  f.stages[0].id = created.stages[0].id;
                  f.stages[0].order = created.stages[0].order;
                }
                for (const st of f.stages) st.funnelId = created.id;

                next = next.map((x) => (x.id === oldId ? f : x));
              }

              const nextIds = new Set(next.map((f) => f.id));
              for (const old of baseline) {
                if (!nextIds.has(old.id)) {
                  const res = await fetch(`/api/admin/funnels/${old.id}`, { method: "DELETE" });
                  const json = await res.json().catch(() => null);
                  if (!res.ok) throw new Error(json?.message ?? "Не удалось удалить воронку");
                }
              }

              for (const f of next) {
                const original = baseline.find((x) => x.id === f.id) ?? createdFunnelsById.get(f.id) ?? null;

                for (const st of f.stages) {
                  if (!st.id.startsWith("tmp-stage-")) continue;
                  const res = await fetch("/api/admin/funnels/stages", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ funnelId: f.id, name: st.name }),
                  });
                  const json = await res.json().catch(() => null);
                  if (!res.ok) throw new Error(json?.message ?? "Не удалось добавить этап");
                  const createdStage = json.stage as Stage;
                  st.id = createdStage.id;
                  st.order = createdStage.order;
                  st.funnelId = createdStage.funnelId;
                }

                const originalStages = original?.stages ?? [];
                const currentStageIds = new Set(f.stages.map((s) => s.id));
                for (const os of originalStages) {
                  if (!currentStageIds.has(os.id)) {
                    const res = await fetch(`/api/admin/funnels/stages/${os.id}`, { method: "DELETE" });
                    const json = await res.json().catch(() => null);
                    if (!res.ok) throw new Error(json?.message ?? "Не удалось удалить этап");
                  }
                }

                const originalById = new Map(originalStages.map((s) => [s.id, s]));
                for (const s of f.stages) {
                  const prev = originalById.get(s.id);
                  if (!prev) continue;
                  if (prev.name !== s.name || prev.headerColor !== s.headerColor) {
                    const res = await fetch(`/api/admin/funnels/stages/${s.id}`, {
                      method: "PATCH",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ name: s.name, headerColor: s.headerColor }),
                    });
                    const json = await res.json().catch(() => null);
                    if (!res.ok) throw new Error(json?.message ?? "Не удалось обновить этап");
                  }
                }

                // Persist exactly the visual order from current draft state.
                const orderedStageIds = f.stages.map((s) => s.id);
                if (orderedStageIds.length) {
                  const res = await fetch("/api/admin/funnels/stages/reorder", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ funnelId: f.id, orderedStageIds }),
                  });
                  const json = await res.json().catch(() => null);
                  if (!res.ok) throw new Error(json?.message ?? "Не удалось сохранить порядок этапов");
                }
              }

              const normalized = next.map((f) => ({
                ...f,
                stages: f.stages.map((s, i) => ({ ...s, order: i + 1, funnelId: f.id })),
              }));
              setFunnels(normalized);
              setBaseline(normalized);
              setNewFunnelName("");
            } catch (e) {
              const msg = e instanceof Error ? e.message : "Не удалось сохранить изменения";
              alert(msg);
            } finally {
              setIsSaving(false);
            }
          }}
          style={{
            height: 36,
            padding: "0 14px",
            borderRadius: 8,
            border: "none",
            color: "#fff",
            fontSize: 13,
            cursor: isDirty && !isSaving ? "pointer" : "default",
            background:
              isDirty && !isSaving ? (saveHover ? "#337fe8" : "#0f68e4") : "#aeafb1",
          }}
        >
          {isSaving ? "Сохранение..." : "Сохранить"}
        </button>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "#fff",
          border: "1px solid #eee",
          borderRadius: 12,
          padding: 10,
        }}
      >
        <input
          placeholder="Название новой воронки"
          value={newFunnelName}
          onChange={(e) => setNewFunnelName(e.target.value)}
          style={{ ...inputStyle, flex: 1 }}
        />
        <button
          type="button"
          title="Добавить воронку"
          onClick={() => {
            const name = newFunnelName.trim();
            if (!name) return;
            const tempFunnelId = `tmp-funnel-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            const tempStageId = `tmp-stage-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            setFunnels((prev) => [
              ...prev,
              {
                id: tempFunnelId,
                name,
                stages: [
                  {
                    id: tempStageId,
                    funnelId: tempFunnelId,
                    name: "Новая",
                    order: 1,
                    headerColor: "#ccd0e1",
                  },
                ],
              },
            ]);
            setNewFunnelName("");
          }}
          style={iconBtn}
        >
          <Plus size={16} />
        </button>
      </div>

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
          <div
            style={{
              padding: 12,
              borderBottom: "1px solid #eee",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <span style={{ fontWeight: 900 }}>{funnel.name}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                title="Добавить этап"
                onClick={() => {
                  const stageName = prompt("Название нового этапа", "Новый этап")?.trim();
                  if (!stageName) return;
                  const tempStageId = `tmp-stage-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
                  setFunnels((prev) =>
                    prev.map((f) =>
                      f.id === funnel.id
                        ? {
                            ...f,
                            stages: [
                              ...f.stages,
                              {
                                id: tempStageId,
                                funnelId: f.id,
                                name: stageName,
                                order: f.stages.length + 1,
                                headerColor: "#ccd0e1",
                              },
                            ],
                          }
                        : f
                    )
                  );
                }}
                style={iconBtn}
              >
                <Plus size={16} />
              </button>
              <button
                type="button"
                title="Удалить воронку"
                onClick={() => {
                  if (!confirm(`Удалить воронку "${funnel.name}"?`)) return;
                  setFunnels((prev) => prev.filter((f) => f.id !== funnel.id));
                }}
                style={iconBtn}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(e) => {
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
                    onChange={(patch) => {
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
                    }}
                    onDelete={() => {
                      if (!confirm(`Удалить этап "${s.name}"?`)) return;
                      setFunnels((prev) =>
                        prev.map((ff) =>
                          ff.id !== funnel.id
                            ? ff
                            : {
                                ...ff,
                                stages: ff.stages
                                  .filter((x) => x.id !== s.id)
                                  .sort((a, b) => a.order - b.order)
                                  .map((x, i) => ({ ...x, order: i + 1 })),
                              }
                        )
                      );
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
  onDelete,
}: {
  stage: Stage;
  onChange: (patch: Partial<Pick<Stage, "name" | "headerColor">>) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stage.id,
  });

  const [hex, setHex] = useState(stage.headerColor);
  const isValid = /^#[0-9a-fA-F]{6}$/.test(hex.trim());
  const safeColor = isValid ? hex.trim() : "#ccd0e1";

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.65 : 1,
        display: "grid",
        gridTemplateColumns: "1fr auto auto",
        gap: 10,
        padding: 12,
        borderTop: "1px solid #eee",
        alignItems: "center",
      }}
    >
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
        <input
          type="color"
          value={safeColor}
          onChange={(e) => {
            const v = e.target.value;
            setHex(v);
            onChange({ headerColor: v });
          }}
          title="Выбрать цвет"
          style={{
            width: 40,
            height: 34,
            borderRadius: 10,
            border: "1px solid #ededed",
            background: safeColor,
            padding: 0,
            cursor: "pointer",
          }}
        />
        <button
          type="button"
          onClick={onDelete}
          style={{ ...iconBtn, color: "#b42318" }}
          title="Удалить этап"
        >
          <Trash2 size={16} />
        </button>
        <button
          type="button"
          {...attributes}
          {...listeners}
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            border: "none",
            background: "transparent",
            display: "grid",
            placeItems: "center",
            cursor: "grab",
          }}
          title="Перетащить"
        >
          <GripVertical size={16} />
        </button>
      </div>
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 8,
  border: "1px solid #dcdfe6",
  background: "#fff",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
  color: "#111",
};

const inputStyle: React.CSSProperties = {
  height: 38,
  borderRadius: 8,
  border: "1px solid #dcdfe6",
  padding: "0 10px",
  outline: "none",
  fontSize: 13,
};

