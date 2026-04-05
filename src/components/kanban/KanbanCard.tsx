"use client";

import type { KanbanClient } from "./types";
import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
const ICON_QUALIFIED = "/src/icons/active.svg";
const ICON_NOT_QUALIFIED = "/src/icons/not-active.svg";
import { formatRuDayMonthWeekdayMoscow, nextTaskDueColor } from "@/lib/date";
import { MONEY_PROGRESS_ICON_SRC } from "@/lib/moneyProgressIcons";

function cardDisplayName(c: KanbanClient) {
  return [c.firstName, c.middleName, c.lastName]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

export default function KanbanCard({ client }: { client: KanbanClient }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `card:${client.id}` });

  const nextDue = client.nextTask?.dueAt ? new Date(client.nextTask.dueAt) : null;
  const nextHasTime = client.nextTask?.dueHasTime ?? false;
  const NO_TASK_COLOR = "#a4a4a4";
  const nextLabel = nextDue
    ? formatRuDayMonthWeekdayMoscow(nextDue, nextHasTime)
    : "Нет задачи";
  const nextColor = nextDue ? nextTaskDueColor(nextDue, nextHasTime) : NO_TASK_COLOR;

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
        <div style={{ fontWeight: 800, fontSize: 13, color: "#111" }}>{cardDisplayName(client)}</div>
        {client.septicModel?.name?.trim() ? (
          <div style={{ fontSize: 12, color: "#555" }}>{client.septicModel.name}</div>
        ) : null}
        {(client.shortComment ?? "").trim() ? (
          <div style={{ fontSize: 12, color: "#777" }}>{client.shortComment}</div>
        ) : null}

        <div
          style={{
            marginTop: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: nextColor,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: nextColor,
              }}
            >
              {nextLabel}
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
        {client.qualified !== null ? (
          <IconPill title={client.qualified ? "Квалифицирован" : "Не квалифицирован"}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={client.qualified ? ICON_QUALIFIED : ICON_NOT_QUALIFIED}
              alt=""
              width={16}
              height={16}
              style={{ display: "block" }}
            />
          </IconPill>
        ) : null}
        {client.moneyProgress != null ? (
          <IconPill title={moneyProgressTitle(client.moneyProgress)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={MONEY_PROGRESS_ICON_SRC[client.moneyProgress]}
              alt=""
              width={16}
              height={16}
              style={{ display: "block" }}
            />
          </IconPill>
        ) : null}
        {client.gsoType != null ? (
          <IconPill title={client.gsoType === "GSO1" ? "ГСО 1" : "ГСО 2"}>
            <span style={{ fontSize: 11, fontWeight: 900 }}>
              {client.gsoType === "GSO1" ? "ГСО1" : "ГСО2"}
            </span>
          </IconPill>
        ) : null}
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

function moneyProgressTitle(v: NonNullable<KanbanClient["moneyProgress"]>) {
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

