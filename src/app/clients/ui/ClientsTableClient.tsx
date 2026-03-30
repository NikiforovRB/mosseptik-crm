"use client";

import { useMemo, useState } from "react";

type Manager = { id: string; firstName: string; lastName: string; role: "ADMIN" | "MANAGER" };
type ClientRow = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  assignedManager: { id: string; firstName: string; lastName: string } | null;
};

export default function ClientsTableClient({
  canFilter,
  managers,
  effectiveManagerId,
  clients,
}: {
  canFilter: boolean;
  managers: Manager[];
  effectiveManagerId: string;
  clients: ClientRow[];
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const rows = useMemo(() => {
    if (q.length < 2) return clients;
    return clients.filter((c) => {
      const managerName = c.assignedManager
        ? `${c.assignedManager.firstName} ${c.assignedManager.lastName}`.toLowerCase()
        : "";
      return (
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q) ||
        managerName.includes(q)
      );
    });
  }, [clients, q]);

  return (
    <>
      <form method="get" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {canFilter ? (
          <select
            name="managerId"
            defaultValue={effectiveManagerId}
            style={{ height: 38, minWidth: 260, padding: "0 10px", fontSize: 13 }}
          >
            <option value="">Все ответственные</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.firstName} {m.lastName} ({m.role === "ADMIN" ? "Админ" : "Менеджер"})
              </option>
            ))}
          </select>
        ) : null}

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск (мин. 2 символа)"
          style={{ height: 38, minWidth: 280, padding: "0 10px", fontSize: 13 }}
        />

        {canFilter ? (
          <button type="submit" style={{ height: 38, padding: "0 12px", fontSize: 13 }}>
            Применить
          </button>
        ) : null}
      </form>

      <div
        style={{
          background: "#fff",
          border: "1px solid #eee",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#fafafa" }}>
              <th style={th}>Имя</th>
              <th style={th}>Фамилия</th>
              <th style={th}>Телефон</th>
              <th style={th}>Ответственный</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} style={{ borderTop: "1px solid #eee" }}>
                <td style={td}>{c.firstName || "—"}</td>
                <td style={td}>{c.lastName || "—"}</td>
                <td style={td}>{c.phone || "—"}</td>
                <td style={td}>
                  {c.assignedManager
                    ? `${c.assignedManager.firstName} ${c.assignedManager.lastName}`.trim()
                    : "—"}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td style={td} colSpan={4}>
                  Клиенты не найдены.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  fontSize: 12,
  color: "#666",
  fontWeight: 500,
};

const td: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: 13,
  color: "#111",
};

