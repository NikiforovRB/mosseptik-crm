"use client";

import { useState } from "react";
import { fileToWebpBlob } from "@/lib/image";
import { presignUpload, putObject } from "@/lib/upload";

type UserRow = {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role: "ADMIN" | "MANAGER";
  avatarOriginalKey?: string | null;
  avatarWebpKey?: string | null;
};

export default function UsersAdmin({ initial }: { initial: UserRow[] }) {
  const [users, setUsers] = useState<UserRow[]>(initial);
  const [draft, setDraft] = useState({
    username: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "MANAGER" as UserRow["role"],
  });

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div
        style={{
          background: "#fff",
          border: "1px solid #eee",
          borderRadius: 14,
          padding: 14,
          display: "grid",
          gap: 10,
        }}
      >
        <div style={{ fontWeight: 900 }}>Добавить пользователя</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 180px auto", gap: 10 }}>
          <input
            placeholder="Логин"
            value={draft.username}
            onChange={(e) => setDraft((d) => ({ ...d, username: e.target.value }))}
            style={input}
          />
          <input
            placeholder="Пароль"
            type="password"
            value={draft.password}
            onChange={(e) => setDraft((d) => ({ ...d, password: e.target.value }))}
            style={input}
          />
          <input
            placeholder="Имя"
            value={draft.firstName}
            onChange={(e) => setDraft((d) => ({ ...d, firstName: e.target.value }))}
            style={input}
          />
          <input
            placeholder="Фамилия"
            value={draft.lastName}
            onChange={(e) => setDraft((d) => ({ ...d, lastName: e.target.value }))}
            style={input}
          />
          <select
            value={draft.role}
            onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value as any }))}
            style={input}
          >
            <option value="MANAGER">Менеджер</option>
            <option value="ADMIN">Администратор</option>
          </select>
          <button
            type="button"
            className="ms-primaryBtn"
            style={primaryBtn}
            onClick={async () => {
              const res = await fetch("/api/admin/users", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(draft),
              });
              if (!res.ok) return alert("Не удалось создать пользователя");
              const json = await res.json();
              setUsers((u) => [...u, json.user]);
              setDraft({ username: "", password: "", firstName: "", lastName: "", role: "MANAGER" });
            }}
          >
            Создать
          </button>
        </div>
      </div>

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

  return (
    <tr style={{ borderTop: "1px solid #eee" }}>
      <td style={td}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            title="Аватар"
            style={{
              width: 30,
              height: 30,
              borderRadius: 999,
              border: "1px solid #ededed",
              background: "#fafafa",
            }}
          />
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
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
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

const primaryBtn: React.CSSProperties = {
  height: 38,
  borderRadius: 10,
  border: "none",
  background: "#111",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
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

