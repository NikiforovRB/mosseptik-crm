"use client";

import { useState } from "react";

type Row = { id: string; name: string };

export default function SepticsAdmin({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initial);
  const [name, setName] = useState("");

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div
        style={{
          background: "#fff",
          border: "1px solid #eee",
          borderRadius: 14,
          padding: 14,
          display: "flex",
          gap: 10,
          alignItems: "center",
        }}
      >
        <input
          placeholder="Название модели"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={input}
        />
        <button
          type="button"
          style={primaryBtn}
          onClick={async () => {
            const res = await fetch("/api/admin/septics", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ name }),
            });
            if (!res.ok) return alert("Не удалось добавить");
            const json = await res.json();
            setRows((r) => [...r, json.septic]);
            setName("");
          }}
        >
          Добавить
        </button>
      </div>

      <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 14 }}>
        <div style={{ display: "grid" }}>
          {rows.map((r) => (
            <SepticRow
              key={r.id}
              row={r}
              onChange={(next) =>
                setRows((all) => all.map((x) => (x.id === next.id ? next : x)))
              }
              onDelete={() => setRows((all) => all.filter((x) => x.id !== r.id))}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SepticRow({
  row,
  onChange,
  onDelete,
}: {
  row: Row;
  onChange: (r: Row) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(row.name);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto auto",
        gap: 10,
        padding: 12,
        borderTop: "1px solid #eee",
        alignItems: "center",
      }}
    >
      <input value={name} onChange={(e) => setName(e.target.value)} style={input} />
      <button
        type="button"
        style={secondaryBtn}
        onClick={async () => {
          const res = await fetch(`/api/admin/septics/${row.id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ name }),
          });
          if (!res.ok) return alert("Не удалось сохранить");
          const json = await res.json();
          onChange(json.septic);
        }}
      >
        Сохранить
      </button>
      <button
        type="button"
        style={dangerBtn}
        onClick={async () => {
          if (!confirm("Удалить модель?")) return;
          const res = await fetch(`/api/admin/septics/${row.id}`, { method: "DELETE" });
          if (!res.ok) return alert("Не удалось удалить");
          onDelete();
        }}
      >
        Удалить
      </button>
    </div>
  );
}

const input: React.CSSProperties = {
  height: 38,
  borderRadius: 10,
  border: "1px solid #ededed",
  padding: "0 10px",
  outline: "none",
  fontSize: 13,
  background: "#fff",
  width: "100%",
};

const primaryBtn: React.CSSProperties = {
  height: 38,
  borderRadius: 10,
  border: "none",
  background: "#111",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
  padding: "0 12px",
};

const secondaryBtn: React.CSSProperties = {
  height: 38,
  borderRadius: 10,
  border: "1px solid #ededed",
  background: "#fff",
  color: "#111",
  fontWeight: 900,
  cursor: "pointer",
  padding: "0 12px",
};

const dangerBtn: React.CSSProperties = {
  height: 38,
  borderRadius: 10,
  border: "1px solid #ffd6d6",
  background: "#fff",
  color: "#c62828",
  fontWeight: 900,
  cursor: "pointer",
  padding: "0 12px",
};

