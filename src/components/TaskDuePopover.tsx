"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import {
  buildDueIsoMoscow,
  formatRuDayMonthWeekdayMoscow,
  formatMoscowTime24,
  formatRuMonthYearTitle,
  nextTaskDueColor,
} from "@/lib/date";
import { useDismissOnOutsideClick } from "@/hooks/useDismissOnOutsideClick";

function addMonths(d: Date, delta: number) {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

function buildMonthGrid(monthStart: Date) {
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const firstWeekday = (first.getDay() + 6) % 7;
  const days = last.getDate();
  const cells: Array<Date | null> = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const navBtn: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 10,
  border: "1px solid #ededed",
  background: "#fff",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
};

export default function TaskDuePopover({
  calendarDate,
  hasTime,
  timeHHmm,
  allowFuture = false,
  onApply,
}: {
  calendarDate: Date;
  hasTime: boolean;
  timeHHmm: string;
  allowFuture?: boolean;
  onApply: (next: { calendarDate: Date; hasTime: boolean; timeHHmm: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1));
  const [draftDate, setDraftDate] = useState(calendarDate);
  const [draftHasTime, setDraftHasTime] = useState(hasTime);
  const [draftTime, setDraftTime] = useState(timeHHmm);
  const rootRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismissOnOutsideClick(open, close, rootRef);

  useEffect(() => {
    if (!open) return;
    setDraftDate(calendarDate);
    setDraftHasTime(hasTime);
    setDraftTime(hasTime ? timeHHmm : "");
    setMonth(new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1));
  }, [open, calendarDate, hasTime, timeHHmm]);

  const grid = useMemo(() => buildMonthGrid(month), [month]);
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

  const previewIso = buildDueIsoMoscow(draftDate, draftHasTime, draftTime).dueAt;
  const buttonLabel =
    previewIso != null
      ? formatRuDayMonthWeekdayMoscow(new Date(previewIso), draftHasTime)
      : formatRuDayMonthWeekdayMoscow(new Date(), false);

  const committedPreview = buildDueIsoMoscow(calendarDate, hasTime, timeHHmm).dueAt;
  const closedLabel =
    committedPreview != null
      ? formatRuDayMonthWeekdayMoscow(new Date(committedPreview), hasTime)
      : buttonLabel;

  const labelColor = (() => {
    if (open && previewIso) {
      return nextTaskDueColor(new Date(previewIso), draftHasTime);
    }
    if (committedPreview) {
      return nextTaskDueColor(new Date(committedPreview), hasTime);
    }
    return "#111";
  })();

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          height: 36,
          padding: "0 12px",
          borderRadius: 10,
          border: "1px solid #ededed",
          background: "#fff",
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 700,
          color: labelColor,
        }}
      >
        <CalendarDays size={16} />
        {open ? buttonLabel : closedLabel}
      </button>

      {open ? (
        <div
          style={{
            position: "absolute",
            bottom: 44,
            left: 0,
            zIndex: 20,
            background: "#fff",
            border: "1px solid #ededed",
            borderRadius: 12,
            padding: 10,
            boxShadow: "0 18px 40px rgba(0,0,0,0.12)",
            width: 280,
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button type="button" style={navBtn} onClick={() => setMonth(addMonths(month, -1))}>
              <ChevronLeft size={18} />
            </button>
            <div style={{ fontWeight: 900, fontSize: 13 }}>{formatRuMonthYearTitle(month)}</div>
            <button type="button" style={navBtn} onClick={() => setMonth(addMonths(month, 1))}>
              <ChevronRight size={18} />
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 6,
              marginTop: 2,
              fontSize: 12,
              color: "#888",
            }}
          >
            {["пн", "вт", "ср", "чт", "пт", "сб", "вс"].map((d) => (
              <div key={d} style={{ textAlign: "center", fontWeight: 800 }}>
                {d}
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
            {grid.map((cell, idx) => {
              if (!cell) return <div key={`e-${idx}`} />;
              const start = new Date(cell.getFullYear(), cell.getMonth(), cell.getDate()).getTime();
              const disabled = !allowFuture && start > todayStart;
              const isActive =
                cell.getFullYear() === draftDate.getFullYear() &&
                cell.getMonth() === draftDate.getMonth() &&
                cell.getDate() === draftDate.getDate();

              return (
                <button
                  key={cell.toISOString()}
                  type="button"
                  disabled={disabled}
                  onClick={() => setDraftDate(new Date(cell))}
                  style={{
                    height: 34,
                    borderRadius: 10,
                    border: "1px solid #ededed",
                    background: isActive ? "#111" : "#fff",
                    color: isActive ? "#fff" : "#111",
                    fontWeight: 800,
                    cursor: disabled ? "not-allowed" : "pointer",
                    opacity: disabled ? 0.35 : 1,
                  }}
                >
                  {cell.getDate()}
                </button>
              );
            })}
          </div>

          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={draftHasTime}
              onChange={(e) => {
                const v = e.target.checked;
                setDraftHasTime(v);
                if (v && !draftTime) {
                  const now = new Date();
                  setDraftTime(formatMoscowTime24(now));
                }
              }}
            />
            Указать время
          </label>

          {draftHasTime ? (
            <input
              type="time"
              value={draftTime}
              onChange={(e) => setDraftTime(e.target.value)}
              step={60}
              style={{ height: 36, padding: "0 8px", fontSize: 13, borderRadius: 8, border: "1px solid #ededed" }}
            />
          ) : null}

          <button
            type="button"
            onClick={() => {
              onApply({
                calendarDate: draftDate,
                hasTime: draftHasTime,
                timeHHmm: draftHasTime ? draftTime : "",
              });
              setOpen(false);
            }}
            style={{
              height: 36,
              borderRadius: 10,
              border: "none",
              background: "#0f68e4",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Готово
          </button>
        </div>
      ) : null}
    </div>
  );
}
