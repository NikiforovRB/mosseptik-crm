"use client";

import { useEffect, useMemo, useState } from "react";

type Assignee = { id: string; firstName: string; lastName: string; role: "ADMIN" | "MANAGER" };

export default function CreateClientModal({
  open,
  onClose,
  defaultSection,
}: {
  open: boolean;
  onClose: () => void;
  defaultSection: "montazh" | "service";
}) {
  const [me, setMe] = useState<{ role: "ADMIN" | "MANAGER"; id: string } | null>(null);
  const [assignees, setAssignees] = useState<Assignee[]>([]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [section, setSection] = useState<"montazh" | "service">(defaultSection);
  const [assignedManagerId, setAssignedManagerId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSection(defaultSection);
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setMe(j?.user ? { id: j.user.id, role: j.user.role } : null))
      .catch(() => setMe(null));
    fetch("/api/users/assignees")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setAssignees(Array.isArray(j?.users) ? j.users : []))
      .catch(() => setAssignees([]));
  }, [open, defaultSection]);

  useEffect(() => {
    if (!open) return;
    if (me?.role !== "ADMIN") return;
    if (!assignedManagerId && assignees[0]?.id) setAssignedManagerId(assignees[0].id);
  }, [open, me?.role, assignees, assignedManagerId]);

  const canPickAssignee = me?.role === "ADMIN";
  const ready = firstName.trim().length > 0 && lastName.trim().length > 0;

  const assigneeLabel = useMemo(() => {
    const a = assignees.find((x) => x.id === assignedManagerId);
    if (!a) return "—";
    return `${a.firstName} ${a.lastName}`;
  }, [assignees, assignedManagerId]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "grid",
        placeItems: "center",
        padding: 16,
        zIndex: 50,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          background: "#fff",
          borderRadius: 16,
          padding: 14,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div style={{ fontSize: 16, color: "#111" }}>Новый клиент</div>
          <button type="button" onClick={onClose} style={iconBtn} aria-label="Закрыть">
            ✕
          </button>
        </div>

        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Имя">
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} style={input} />
            </Field>
            <Field label="Фамилия">
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} style={input} />
            </Field>
          </div>

          <Field label="Телефон">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} style={input} />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Ответственный">
              <select
                disabled={!canPickAssignee}
                value={canPickAssignee ? assignedManagerId : (assignees[0]?.id ?? "")}
                onChange={(e) => setAssignedManagerId(e.target.value)}
                style={{ ...input, background: canPickAssignee ? "#fff" : "#f7f7f7" }}
              >
                {assignees.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName} ({u.role === "ADMIN" ? "Админ" : "Менеджер"})
                  </option>
                ))}
              </select>
              {!canPickAssignee ? (
                <div style={{ fontSize: 12, color: "#777", marginTop: 6 }}>
                  Ответственный: {assigneeLabel}
                </div>
              ) : null}
            </Field>

            <Field label="Раздел воронки">
              <div style={segWrap}>
                <button type="button" style={segBtn(section === "montazh")} onClick={() => setSection("montazh")}>
                  Монтаж
                </button>
                <button type="button" style={segBtn(section === "service")} onClick={() => setSection("service")}>
                  Сервис
                </button>
              </div>
            </Field>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
          <button type="button" onClick={onClose} style={secondaryBtn}>
            Отмена
          </button>
          <button
            type="button"
            disabled={!ready || saving}
            onClick={async () => {
              if (!ready) return;
              setSaving(true);
              try {
                const res = await fetch("/api/clients/create", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({
                    section,
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    phone: phone.trim() || undefined,
                    assignedManagerId: canPickAssignee ? assignedManagerId || null : null,
                  }),
                });
                const json = await res.json().catch(() => null);
                if (!res.ok) throw new Error(json?.error ?? "create_failed");
                window.location.href = `/clients/${json.clientId}`;
              } catch {
                alert("Не удалось создать клиента");
                setSaving(false);
              }
            }}
            style={{ ...primaryBtn, opacity: !ready || saving ? 0.6 : 1 }}
          >
            {saving ? "Создаём..." : "Создать"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, color: "#666" }}>{label}</span>
      {children}
    </label>
  );
}

const input: React.CSSProperties = {
  height: 40,
  borderRadius: 12,
  border: "1px solid #ededed",
  padding: "0 12px",
  outline: "none",
  fontSize: 13,
  background: "#fff",
};

const primaryBtn: React.CSSProperties = {
  height: 40,
  borderRadius: 12,
  border: "none",
  background: "#111",
  color: "#fff",
  padding: "0 14px",
  cursor: "pointer",
};

const secondaryBtn: React.CSSProperties = {
  height: 40,
  borderRadius: 12,
  border: "1px solid #ededed",
  background: "#fff",
  color: "#111",
  padding: "0 14px",
  cursor: "pointer",
};

const iconBtn: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 10,
  border: "1px solid #ededed",
  background: "#fff",
  cursor: "pointer",
};

const segWrap: React.CSSProperties = {
  height: 40,
  borderRadius: 12,
  border: "1px solid #ededed",
  background: "#fff",
  padding: 3,
  display: "grid",
  gridAutoFlow: "column",
  gap: 3,
};

const segBtn = (active: boolean): React.CSSProperties => ({
  height: 32,
  borderRadius: 10,
  border: "none",
  background: active ? "#111" : "transparent",
  color: active ? "#fff" : "#111",
  cursor: "pointer",
  transition: "160ms ease",
});

