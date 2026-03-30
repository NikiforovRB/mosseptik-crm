"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { formatRuDayMonthWeekday } from "@/lib/date";

export default function CalendarPopover({
  value,
  onChange,
}: {
  value: Date;
  onChange: (d: Date) => void;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1));

  const grid = useMemo(() => buildMonthGrid(month), [month]);
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

  return (
    <div style={{ position: "relative" }}>
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
          color: "#111",
        }}
      >
        <CalendarDays size={16} />
        {formatRuDayMonthWeekday(value)}
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
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button type="button" style={navBtn} onClick={() => setMonth(addMonths(month, -1))}>
              <ChevronLeft size={18} />
            </button>
            <div style={{ fontWeight: 900, fontSize: 13 }}>
              {month.toLocaleString("ru-RU", { month: "long", year: "numeric" })}
            </div>
            <button type="button" style={navBtn} onClick={() => setMonth(addMonths(month, 1))}>
              <ChevronRight size={18} />
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 6,
              marginTop: 10,
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

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 6,
              marginTop: 6,
            }}
          >
            {grid.map((cell) => {
              if (!cell) return <div key={Math.random()} />;
              const start = new Date(cell.getFullYear(), cell.getMonth(), cell.getDate()).getTime();
              const disabled = start > todayStart;
              const isActive =
                cell.getFullYear() === value.getFullYear() &&
                cell.getMonth() === value.getMonth() &&
                cell.getDate() === value.getDate();

              return (
                <button
                  key={cell.toISOString()}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChange(new Date(cell));
                    setOpen(false);
                  }}
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
        </div>
      ) : null}
    </div>
  );
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

function addMonths(d: Date, delta: number) {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

function buildMonthGrid(monthStart: Date) {
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);

  // Monday=0..Sunday=6
  const firstWeekday = (first.getDay() + 6) % 7;
  const days = last.getDate();

  const cells: Array<Date | null> = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

