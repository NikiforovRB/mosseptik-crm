"use client";

import { useMemo, useState } from "react";
import CreateClientModal from "./CreateClientModal";

export default function HomeTopBar({
  selectedSection,
}: {
  selectedSection: "montazh" | "service";
}) {
  const [open, setOpen] = useState(false);
  const [addClientHover, setAddClientHover] = useState(false);

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
        onMouseEnter={() => setAddClientHover(true)}
        onMouseLeave={() => setAddClientHover(false)}
        style={{
          height: 38,
          padding: "0 14px",
          borderRadius: 12,
          border: "1px solid #ededed",
          background: "#fff",
          fontWeight: 900,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          transition: "color 120ms ease",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={addClientHover ? "/src/icons/folder-nav.svg" : "/src/icons/folder.svg"}
          alt=""
          width={18}
          height={18}
          style={{ display: "block", flexShrink: 0 }}
        />
        <span style={{ color: addClientHover ? "#5A86EE" : "#a4a4a4" }}>Добавить нового клиента</span>
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
    border: "1px solid #c7c6c5",
    background: "transparent",
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
    background: isActive ? "#cbd1db" : "transparent",
    color: isActive ? "#000000" : "#8c8e90",
    fontWeight: 900,
    cursor: "pointer",
    transition: "160ms ease",
    transform: "translateY(-1px)",
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

