"use client";

import { useMemo, useState } from "react";
import CreateClientModal from "./CreateClientModal";

export default function HomeTopBar({
  selectedSection,
}: {
  selectedSection: "montazh" | "service";
}) {
  const [open, setOpen] = useState(false);

  const active = useMemo(() => selectedSection, [selectedSection]);

  return (
    <div
      style={{
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        background: "transparent",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          height: 38,
          padding: "0 14px",
          borderRadius: 12,
          border: "1px solid #ededed",
          background: "#fff",
          color: "#111",
          fontWeight: 900,
          cursor: "pointer",
        }}
      >
        Добавить нового клиента
      </button>

      <SegmentedToggle active={active} />

      <CreateClientModal
        open={open}
        onClose={() => setOpen(false)}
        defaultSection={active}
      />
    </div>
  );
}

function SegmentedToggle({ active }: { active: "montazh" | "service" }) {
  const wrap: React.CSSProperties = {
    height: 38,
    borderRadius: 12,
    border: "1px solid #ededed",
    background: "#fff",
    padding: 3,
    display: "grid",
    gridAutoFlow: "column",
    gap: 3,
  };

  const btn = (isActive: boolean): React.CSSProperties => ({
    height: 32,
    padding: "0 12px",
    borderRadius: 10,
    border: "none",
    background: isActive ? "#111" : "transparent",
    color: isActive ? "#fff" : "#111",
    fontWeight: 900,
    cursor: "pointer",
    transition: "160ms ease",
  });

  return (
    <div style={wrap} aria-label="Раздел">
      <button
        type="button"
        style={btn(active === "montazh")}
        onClick={() => {
          const url = new URL(window.location.href);
          url.searchParams.set("section", "montazh");
          window.location.href = url.toString();
        }}
      >
        Монтаж
      </button>
      <button
        type="button"
        style={btn(active === "service")}
        onClick={() => {
          const url = new URL(window.location.href);
          url.searchParams.set("section", "service");
          window.location.href = url.toString();
        }}
      >
        Сервис
      </button>
    </div>
  );
}

