"use client";

import { useEffect, useRef, useState } from "react";
import { fileToWebpBlob } from "@/lib/image";
import { presignUpload, putObject } from "@/lib/upload";

const BTN_IDLE = "#666666";
const BTN_ACTIVE = "#0f68e4";
const BTN_ACTIVE_HOVER = "#337fe8";

type UserRow = {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role: "ADMIN" | "MANAGER";
  avatarOriginalKey?: string | null;
  avatarWebpKey?: string | null;
};

const emptyDraft = () => ({
  username: "",
  password: "",
  firstName: "",
  lastName: "",
  role: "MANAGER" as UserRow["role"],
});

export default function UsersAdmin({ initial }: { initial: UserRow[] }) {
  const [users, setUsers] = useState<UserRow[]>(initial);
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState(() => emptyDraft());
  const [creating, setCreating] = useState(false);
  const [createHover, setCreateHover] = useState(false);
  const [addFieldErrors, setAddFieldErrors] = useState<Partial<Record<"username" | "password" | "firstName", string>>>(
    {},
  );
  const [addServerError, setAddServerError] = useState<string | null>(null);

  const closeAddModal = () => {
    setAddOpen(false);
    setDraft(emptyDraft());
    setAddFieldErrors({});
    setAddServerError(null);
    setCreateHover(false);
  };

  const canCreate =
    draft.username.trim().length >= 2 &&
    draft.password.length >= 6 &&
    draft.firstName.trim().length >= 1;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <h1 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>Пользователи</h1>
      <button
        type="button"
        onClick={() => setAddOpen(true)}
        style={{
          width: "fit-content",
          height: 40,
          borderRadius: 12,
          border: "1px solid #ededed",
          background: "#fff",
          color: "#111",
          fontWeight: 800,
          fontSize: 13,
          padding: "0 16px",
          cursor: "pointer",
        }}
      >
        Добавить нового пользователя
      </button>

      {addOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-user-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeAddModal();
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "grid",
            placeItems: "center",
            padding: 20,
            zIndex: 50,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 480,
              background: "#fff",
              borderRadius: 16,
              padding: 24,
              display: "grid",
              gap: 14,
              border: "1px solid #eee",
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div id="add-user-title" style={{ fontSize: 16, fontWeight: 900, color: "#111" }}>
              Новый пользователь
            </div>
            {addServerError ? (
              <div style={{ fontSize: 13, color: "#c62828" }} role="alert">
                {addServerError}
              </div>
            ) : null}
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, color: "#666" }}>Логин</span>
              <input
                value={draft.username}
                onChange={(e) => {
                  setAddServerError(null);
                  setAddFieldErrors((er) => ({ ...er, username: undefined }));
                  setDraft((d) => ({ ...d, username: e.target.value }));
                }}
                style={input}
                aria-invalid={addFieldErrors.username ? true : undefined}
              />
              {addFieldErrors.username ? (
                <span style={{ fontSize: 12, color: "#c62828" }}>{addFieldErrors.username}</span>
              ) : null}
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, color: "#666" }}>Пароль</span>
              <input
                type="password"
                value={draft.password}
                onChange={(e) => {
                  setAddServerError(null);
                  setAddFieldErrors((er) => ({ ...er, password: undefined }));
                  setDraft((d) => ({ ...d, password: e.target.value }));
                }}
                style={input}
                aria-invalid={addFieldErrors.password ? true : undefined}
              />
              {addFieldErrors.password ? (
                <span style={{ fontSize: 12, color: "#c62828" }}>{addFieldErrors.password}</span>
              ) : null}
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, color: "#666" }}>Имя</span>
              <input
                value={draft.firstName}
                onChange={(e) => {
                  setAddServerError(null);
                  setAddFieldErrors((er) => ({ ...er, firstName: undefined }));
                  setDraft((d) => ({ ...d, firstName: e.target.value }));
                }}
                style={input}
                aria-invalid={addFieldErrors.firstName ? true : undefined}
              />
              {addFieldErrors.firstName ? (
                <span style={{ fontSize: 12, color: "#c62828" }}>{addFieldErrors.firstName}</span>
              ) : null}
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, color: "#666" }}>Фамилия</span>
              <input
                value={draft.lastName}
                onChange={(e) => setDraft((d) => ({ ...d, lastName: e.target.value }))}
                style={input}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, color: "#666" }}>Роль</span>
              <select
                value={draft.role}
                onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value as UserRow["role"] }))}
                style={input}
              >
                <option value="MANAGER">Менеджер</option>
                <option value="ADMIN">Администратор</option>
              </select>
            </label>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
              <button type="button" style={secondaryBtn} onClick={closeAddModal} disabled={creating}>
                Отмена
              </button>
              <button
                type="button"
                disabled={creating}
                onMouseEnter={() => setCreateHover(true)}
                onMouseLeave={() => setCreateHover(false)}
                onClick={async () => {
                  setAddServerError(null);
                  const nextErrors: Partial<Record<"username" | "password" | "firstName", string>> = {};
                  if (draft.username.trim().length < 2) nextErrors.username = "Логин — не менее 2 символов";
                  if (draft.password.length < 6) nextErrors.password = "Пароль — не менее 6 символов";
                  if (draft.firstName.trim().length < 1) nextErrors.firstName = "Укажите имя";
                  setAddFieldErrors(nextErrors);
                  if (Object.keys(nextErrors).length > 0) return;

                  setCreating(true);
                  try {
                    const res = await fetch("/api/admin/users", {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({
                        ...draft,
                        username: draft.username.trim(),
                        firstName: draft.firstName.trim(),
                        lastName: draft.lastName.trim(),
                      }),
                    });
                    const json = await res.json().catch(() => null);
                    if (!res.ok) {
                      setAddServerError(
                        typeof json?.error === "string" ? json.error : "Не удалось создать пользователя",
                      );
                      return;
                    }
                    setUsers((u) => [...u, json.user]);
                    closeAddModal();
                  } finally {
                    setCreating(false);
                  }
                }}
                style={{
                  height: 40,
                  padding: "0 18px",
                  borderRadius: 10,
                  border: "none",
                  fontSize: 13,
                  fontWeight: 900,
                  cursor: creating || !canCreate ? "default" : "pointer",
                  opacity: creating ? 0.85 : 1,
                  color: "#fff",
                  background:
                    creating || !canCreate
                      ? BTN_IDLE
                      : createHover
                        ? BTN_ACTIVE_HOVER
                        : BTN_ACTIVE,
                }}
              >
                {creating ? "Создание..." : "Создать"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div
        style={{
          background: "#fff",
          border: "1px solid #eee",
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#fafafa" }}>
              <th style={th}>Фото</th>
              <th style={th}>Логин</th>
              <th style={th}>Имя</th>
              <th style={th}>Фамилия</th>
              <th style={th}>Пароль</th>
              <th style={th}>Роль</th>
              <th style={th} />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <UserRowItem
                key={u.id}
                user={u}
                onChange={(next) =>
                  setUsers((all) => all.map((x) => (x.id === next.id ? next : x)))
                }
                onDelete={() => setUsers((all) => all.filter((x) => x.id !== u.id))}
                canDelete={u.username !== "timur"}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 12, color: "#888" }}>
        Пользователь <b>timur</b> защищён от удаления.
      </div>
    </div>
  );
}

function AvatarCircle({ webpKey, title }: { webpKey?: string | null; title?: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!webpKey?.trim()) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    fetch("/api/files/url", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: webpKey }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!cancelled && j?.url) setUrl(String(j.url));
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [webpKey]);

  return (
    <div
      title={title}
      style={{
        width: 36,
        height: 36,
        borderRadius: "50%",
        border: "1px solid #ededed",
        background: "#f3f3f3",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      ) : null}
    </div>
  );
}

function UserRowItem({
  user,
  onChange,
  onDelete,
  canDelete,
}: {
  user: UserRow;
  onChange: (u: UserRow) => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const [edit, setEdit] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    password: "",
  });
  const [uploading, setUploading] = useState(false);
  const [rowSaved, setRowSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  return (
    <tr style={{ borderTop: "1px solid #eee" }}>
      <td style={td}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <AvatarCircle webpKey={user.avatarWebpKey} title="Аватар" />
          <label style={{ fontSize: 12, color: "#666", cursor: "pointer", whiteSpace: "nowrap" }}>
            {uploading ? "Загрузка..." : "Сменить"}
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              disabled={uploading}
              onChange={async (e) => {
                const file = e.target.files?.[0] ?? null;
                e.target.value = "";
                if (!file) return;
                setUploading(true);
                try {
                  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
                  const originalPresign = await presignUpload({
                    purpose: "avatar",
                    variant: "original",
                    contentType: file.type || "application/octet-stream",
                    ext,
                  });
                  const webpBlob = await fileToWebpBlob(file, { maxSize: 320, quality: 0.86 });
                  const webpPresign = await presignUpload({
                    purpose: "avatar",
                    variant: "webp",
                    contentType: "image/webp",
                    ext: "webp",
                  });

                  await putObject(originalPresign.uploadUrl, file);
                  await putObject(webpPresign.uploadUrl, webpBlob);

                  const res = await fetch(`/api/admin/users/${user.id}/avatar`, {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                      avatarOriginalKey: originalPresign.key,
                      avatarWebpKey: webpPresign.key,
                    }),
                  });
                  if (!res.ok) throw new Error("avatar update failed");
                  const json = await res.json();
                  onChange(json.user);
                } catch {
                  alert("Не удалось обновить фото");
                } finally {
                  setUploading(false);
                }
              }}
            />
          </label>
        </div>
      </td>
      <td style={td}>{user.username}</td>
      <td style={td}>
        <input
          value={edit.firstName}
          onChange={(e) => setEdit((x) => ({ ...x, firstName: e.target.value }))}
          style={input}
        />
      </td>
      <td style={td}>
        <input
          value={edit.lastName}
          onChange={(e) => setEdit((x) => ({ ...x, lastName: e.target.value }))}
          style={input}
        />
      </td>
      <td style={td}>
        <input
          placeholder="Новый пароль"
          type="password"
          value={edit.password}
          onChange={(e) => setEdit((x) => ({ ...x, password: e.target.value }))}
          style={input}
        />
      </td>
      <td style={td}>
        <select
          value={edit.role}
          onChange={(e) => setEdit((x) => ({ ...x, role: e.target.value as any }))}
          style={input}
        >
          <option value="MANAGER">Менеджер</option>
          <option value="ADMIN">Администратор</option>
        </select>
      </td>
      <td style={td}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end", alignItems: "center" }}>
          {rowSaved ? <span style={{ fontSize: 13, color: "#16a34a" }}>Изменения сохранены</span> : null}
          <button
            type="button"
            style={secondaryBtn}
            onClick={async () => {
              const res = await fetch(`/api/admin/users/${user.id}`, {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(edit),
              });
              if (!res.ok) return alert("Не удалось сохранить");
              const json = await res.json();
              onChange(json.user);
              setEdit((x) => ({ ...x, password: "" }));
              if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
              setRowSaved(true);
              savedTimerRef.current = setTimeout(() => {
                setRowSaved(false);
                savedTimerRef.current = null;
              }, 4000);
            }}
          >
            Сохранить
          </button>
          <button
            type="button"
            disabled={!canDelete}
            style={{ ...dangerBtn, opacity: canDelete ? 1 : 0.4 }}
            onClick={async () => {
              if (!confirm("Удалить пользователя?")) return;
              const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
              if (!res.ok) return alert("Не удалось удалить");
              onDelete();
            }}
          >
            Удалить
          </button>
        </div>
      </td>
    </tr>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 12px",
  fontSize: 12,
  color: "#666",
  fontWeight: 900,
};

const td: React.CSSProperties = { padding: 8, verticalAlign: "middle" };

const input: React.CSSProperties = {
  height: 38,
  borderRadius: 10,
  border: "1px solid #ededed",
  padding: "0 10px",
  outline: "none",
  fontSize: 13,
  background: "#fff",
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

