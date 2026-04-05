"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const BTN_IDLE = "#666666";
const BTN_ACTIVE = "#0f68e4";
const BTN_ACTIVE_HOVER = "#337fe8";

type Manager = { id: string; firstName: string; lastName: string; role: "ADMIN" | "MANAGER" };
type ClientRow = {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
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
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [edit, setEdit] = useState<ClientRow | null>(null);
  const [editFirst, setEditFirst] = useState("");
  const [editMiddle, setEditMiddle] = useState("");
  const [editLast, setEditLast] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [editRowHover, setEditRowHover] = useState<string | null>(null);
  const [saveHover, setSaveHover] = useState(false);

  const q = query.trim().toLowerCase();

  const isEditDirty = useMemo(() => {
    if (!edit) return false;
    return (
      editFirst.trim() !== (edit.firstName ?? "").trim() ||
      editLast.trim() !== (edit.lastName ?? "").trim() ||
      editMiddle.trim() !== (edit.middleName ?? "").trim() ||
      editPhone.trim() !== (edit.phone ?? "").trim()
    );
  }, [edit, editFirst, editLast, editMiddle, editPhone]);

  const rows = useMemo(() => {
    if (q.length < 2) return clients;
    return clients.filter((c) => {
      const managerName = c.assignedManager
        ? `${c.assignedManager.firstName} ${c.assignedManager.lastName}`.toLowerCase()
        : "";
      const middle = (c.middleName ?? "").toLowerCase();
      return (
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        middle.includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q) ||
        managerName.includes(q)
      );
    });
  }, [clients, q]);

  const openEdit = (c: ClientRow) => {
    setEdit(c);
    setEditFirst(c.firstName);
    setEditMiddle(c.middleName ?? "");
    setEditLast(c.lastName);
    setEditPhone(c.phone ?? "");
  };

  const saveEdit = async () => {
    if (!edit) return;
    setSaving(true);
    try {
      const res = await fetch("/api/clients/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientId: edit.id,
          firstName: editFirst.trim() || "—",
          lastName: editLast.trim() || "",
          middleName: editMiddle.trim() || null,
          phone: editPhone.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("fail");
      setEdit(null);
      router.refresh();
    } catch {
      alert("Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {canFilter ? (
          <select
            value={effectiveManagerId}
            onChange={(e) => {
              const v = e.target.value;
              router.replace(v ? `/clients?managerId=${encodeURIComponent(v)}` : "/clients");
            }}
            style={{ height: 38, minWidth: 260, padding: "0 10px", fontSize: 13, borderRadius: 8, border: "1px solid #ededed" }}
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
          style={{ height: 38, minWidth: 280, padding: "0 10px", fontSize: 13, borderRadius: 8, border: "1px solid #ededed" }}
        />
      </div>

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
              <th style={th}>Отчество</th>
              <th style={th}>Телефон</th>
              <th style={th}>Ответственный</th>
              <th style={{ ...th, width: 48 }} aria-label="Изменить" />
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} style={{ borderTop: "1px solid #eee" }}>
                <td style={td}>{(c.firstName ?? "").trim()}</td>
                <td style={td}>{(c.lastName ?? "").trim()}</td>
                <td style={td}>{(c.middleName ?? "").trim()}</td>
                <td style={td}>{(c.phone ?? "").trim()}</td>
                <td style={td}>
                  {c.assignedManager
                    ? `${c.assignedManager.firstName} ${c.assignedManager.lastName}`.trim()
                    : "—"}
                </td>
                <td style={{ ...td, textAlign: "center", width: 48 }}>
                  <button
                    type="button"
                    title="Редактировать"
                    onMouseEnter={() => setEditRowHover(c.id)}
                    onMouseLeave={() => setEditRowHover(null)}
                    onClick={() => openEdit(c)}
                    style={{
                      width: 36,
                      height: 36,
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      display: "grid",
                      placeItems: "center",
                      padding: 0,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={editRowHover === c.id ? "/src/icons/edit-nav.svg" : "/src/icons/edit.svg"}
                      alt=""
                      width={18}
                      height={18}
                    />
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td style={td} colSpan={6}>
                  Клиенты не найдены.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {edit ? (
        <div
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setEdit(null);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "grid",
            placeItems: "center",
            padding: 24,
            zIndex: 50,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 440,
              background: "#fff",
              borderRadius: 16,
              padding: 28,
              display: "grid",
              gap: 14,
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, color: "#111" }}>Редактировать клиента</div>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, color: "#666" }}>Имя</span>
              <input value={editFirst} onChange={(e) => setEditFirst(e.target.value)} style={inp} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, color: "#666" }}>Фамилия</span>
              <input value={editLast} onChange={(e) => setEditLast(e.target.value)} style={inp} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, color: "#666" }}>Отчество</span>
              <input value={editMiddle} onChange={(e) => setEditMiddle(e.target.value)} style={inp} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, color: "#666" }}>Телефон</span>
              <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} style={inp} />
            </label>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
              <button type="button" onClick={() => setEdit(null)} style={btnSecondary} disabled={saving}>
                Отмена
              </button>
              <button
                type="button"
                disabled={saving || !isEditDirty}
                onMouseEnter={() => setSaveHover(true)}
                onMouseLeave={() => setSaveHover(false)}
                onClick={() => void saveEdit()}
                style={{
                  height: 40,
                  borderRadius: 12,
                  border: "none",
                  color: "#fff",
                  fontSize: 13,
                  padding: "0 14px",
                  cursor: isEditDirty && !saving ? "pointer" : "default",
                  opacity: saving ? 0.7 : 1,
                  background:
                    !isEditDirty || saving
                      ? BTN_IDLE
                      : saveHover
                        ? BTN_ACTIVE_HOVER
                        : BTN_ACTIVE,
                }}
              >
                {saving ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

const inp: React.CSSProperties = {
  height: 40,
  borderRadius: 12,
  border: "1px solid #ededed",
  padding: "0 12px",
  outline: "none",
  fontSize: 13,
};

const btnSecondary: React.CSSProperties = {
  height: 40,
  borderRadius: 12,
  border: "1px solid #ededed",
  background: "#fff",
  color: "#111",
  padding: "0 14px",
  cursor: "pointer",
};

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
