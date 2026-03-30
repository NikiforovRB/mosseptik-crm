"use client";

import type { KanbanClient } from "./types";
import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  BadgeCheck,
  BadgeX,
  CalendarDays,
  CircleDollarSign,
  CircleCheck,
  CircleHelp,
  CircleSlash,
} from "lucide-react";
import { commDateColor, formatRuDayMonthWeekday } from "@/lib/date";

export default function KanbanCard({ client }: { client: KanbanClient }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `card:${client.id}` });

  const lastComm = client.lastCommunicationAt
    ? new Date(client.lastCommunicationAt)
    : null;

  return (
    <Link
      href={`/clients/${client.id}`}
      ref={setNodeRef as any}
      {...attributes}
      {...listeners}
      className="ms-card"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        borderRadius: 12,
        border: "none",
        background: "#fff",
        padding: "10px 0",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 10,
        boxShadow: isDragging ? "0 10px 24px rgba(0,0,0,0.12)" : "none",
        cursor: "pointer",
      }}
    >
      <div style={{ display: "grid", gap: 6, paddingLeft: 12, paddingRight: 0 }}>
        {client.isUrgent ? (
          <div style={{ fontSize: 11, fontWeight: 800, color: "#c62828" }}>
            Срочно
          </div>
        ) : null}
        <div style={{ fontWeight: 800, fontSize: 13, color: "#111" }}>
          {client.firstName} {client.lastName}
        </div>
        <div style={{ fontSize: 12, color: "#555" }}>
          {client.septicModel?.name ?? "—"}
        </div>
        <div style={{ fontSize: 12, color: "#777", minHeight: 16 }}>
          {client.shortComment || " "}
        </div>

        <div
          style={{
            marginTop: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#999" }}>
            <CalendarDays size={14} />
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: lastComm ? commDateColor(lastComm) : "#8b8b8b",
              }}
            >
              {lastComm ? formatRuDayMonthWeekday(lastComm) : "—"}
            </span>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: 8,
          alignContent: "start",
          paddingRight: 12,
        }}
      >
        <IconPill title={client.qualified ? "Квалифицирован" : "Не квалифицирован"}>
          {client.qualified ? <BadgeCheck size={16} /> : <BadgeX size={16} />}
        </IconPill>
        <IconPill title={moneyProgressTitle(client.moneyProgress)}>
          {moneyProgressIcon(client.moneyProgress)}
        </IconPill>
        <IconPill title={client.gsoType === "GSO1" ? "ГСО 1" : "ГСО 2"}>
          <span style={{ fontSize: 11, fontWeight: 900 }}>
            {client.gsoType === "GSO1" ? "ГСО1" : "ГСО2"}
          </span>
        </IconPill>
      </div>
    </Link>
  );
}

function IconPill({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <div
      title={title}
      style={{
        width: 30,
        height: 30,
        borderRadius: 10,
        display: "grid",
        placeItems: "center",
        border: "none",
        color: "#111",
        background: "transparent",
      }}
    >
      {children}
    </div>
  );
}

function moneyProgressTitle(v: KanbanClient["moneyProgress"]) {
  switch (v) {
    case "ASSIGNED":
      return "Назначен";
    case "CONFIRMED":
      return "Подтверждён";
    case "DONE_WITH_MONEY":
      return "Состоялся с деньгами";
    case "DONE_WITHOUT_MONEY":
      return "Состоялся без денег";
    default:
      return "Статус";
  }
}

function moneyProgressIcon(v: KanbanClient["moneyProgress"]) {
  switch (v) {
    case "ASSIGNED":
      return <CircleHelp size={16} />;
    case "CONFIRMED":
      return <CircleCheck size={16} />;
    case "DONE_WITH_MONEY":
      return <CircleDollarSign size={16} />;
    case "DONE_WITHOUT_MONEY":
      return <CircleSlash size={16} />;
    default:
      return <CircleHelp size={16} />;
  }
}

