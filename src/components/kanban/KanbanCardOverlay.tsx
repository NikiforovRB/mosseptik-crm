"use client";

import type { KanbanFunnel } from "./types";
import { DragOverlay } from "@dnd-kit/core";

export default function KanbanCardOverlay({
  funnels,
  activeCardId,
}: {
  funnels: KanbanFunnel[];
  activeCardId: string | null;
  toCardDndId: (id: string) => string;
}) {
  const client = (() => {
    if (!activeCardId) return null;
    for (const f of funnels) {
      for (const s of f.stages) {
        const c = s.clients.find((x) => x.id === activeCardId);
        if (c) return c;
      }
    }
    return null;
  })();

  return (
    <DragOverlay>
      {client ? (
        <div
          style={{
            width: 260,
            borderRadius: 12,
            border: "1px solid #eee",
            background: "#fff",
            padding: 12,
            display: "grid",
            gap: 6,
            boxShadow: "0 14px 30px rgba(0,0,0,0.16)",
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 13, color: "#111" }}>
            {client.firstName} {client.lastName}
          </div>
          <div style={{ fontSize: 12, color: "#555" }}>
            {client.septicModel?.name ?? "—"}
          </div>
          <div style={{ fontSize: 12, color: "#777" }}>
            {client.shortComment || " "}
          </div>
        </div>
      ) : null}
    </DragOverlay>
  );
}

