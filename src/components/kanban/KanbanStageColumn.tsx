"use client";

import type { KanbanStage } from "./types";
import { useDroppable } from "@dnd-kit/core";
import KanbanCard from "./KanbanCard";

export default function KanbanStageColumn({
  stage,
  stageDndId,
}: {
  stage: KanbanStage;
  stageDndId: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stageDndId });
  const count = stage.clients.length;

  return (
    <div
      ref={setNodeRef}
      style={{
        background: "transparent",
        borderRadius: 0,
        border: "none",
        overflow: "visible",
        minHeight: 200,
        boxShadow: isOver ? "0 0 0 2px rgba(17,17,17,0.15) inset" : "none",
      }}
    >
      <div
        style={{
          padding: "10px 0 6px 0",
          background: "transparent",
          color: "#000000",
          fontWeight: 500,
          fontSize: 15,
          display: "flex",
          alignItems: "center",
          gap: 8,
          borderBottom: `2px solid ${stage.headerColor}`,
          borderRadius: 0,
        }}
      >
        <span>{stage.name}</span>
        {count > 0 ? (
          <span style={{ opacity: 0.75 }}>{`• ${count}`}</span>
        ) : null}
      </div>
      <div style={{ padding: "10px 0", display: "grid", gap: 10 }}>
        {stage.clients
          .slice()
          .sort((a, b) => a.orderInStage - b.orderInStage)
          .map((c) => (
            <KanbanCard key={c.id} client={c} />
          ))}
      </div>
    </div>
  );
}

