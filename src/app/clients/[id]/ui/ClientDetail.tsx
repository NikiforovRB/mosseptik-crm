"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatRuDayMonthWeekday } from "@/lib/date";
import CalendarPopover from "@/components/CalendarPopover";
import { fileToWebpBlob } from "@/lib/image";
import { presignUpload, putObject } from "@/lib/upload";
import AttachmentThumb from "@/components/AttachmentThumb";

type UserLite = { id: string; firstName: string; lastName: string; role: string };
type SepticModelLite = { id: string; name: string };
type ClientDetailModel = {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  shortComment: string;
  septicModel: { id: string; name: string } | null;
  septicModelId?: string | null;
  assignedManagerId: string | null;
  assignedManager: { id: string; firstName: string; lastName: string } | null;
  qualified: boolean;
  moneyProgress: "ASSIGNED" | "CONFIRMED" | "DONE_WITH_MONEY" | "DONE_WITHOUT_MONEY";
  gsoType: "GSO1" | "GSO2";
  isUrgent: boolean;
  funnelStage: { id: string; name: string; funnel: { name: string } };
  communications: Array<{
    id: string;
    text: string;
    createdAt: string;
    communicationDate: string;
    author: { id: string; firstName: string; lastName: string; role: string };
    photos: Array<{ id: string; originalKey: string; webpKey: string; createdAt: string }>;
  }>;
};

export default function ClientDetail({
  client: initialClient,
  users,
  septicModels,
  backHref,
  canReassign,
}: {
  client: ClientDetailModel;
  users: UserLite[];
  septicModels: SepticModelLite[];
  backHref: string;
  canReassign: boolean;
}) {
  const [client, setClient] = useState<ClientDetailModel>(initialClient);
  const [text, setText] = useState("");
  const [date, setDate] = useState<Date>(() => new Date());
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [savingClient, setSavingClient] = useState(false);

  const title = `${client.firstName} ${client.lastName}`.trim();

  const managers = useMemo(
    () => users.filter((u) => u.role === "MANAGER" || u.role === "ADMIN"),
    [users]
  );

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(280px, 30%) 1fr",
        gap: 16,
        padding: 16,
      }}
    >
      <aside
        style={{
          background: "#fff",
          borderRadius: 14,
          border: "1px solid #eee",
          padding: 14,
          height: "calc(100vh - 64px - 32px)",
          position: "sticky",
          top: 80,
          alignSelf: "start",
          overflow: "auto",
        }}
      >
        <Link
          href={backHref}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            height: 34,
            padding: "0 10px",
            borderRadius: 12,
            border: "1px solid #ededed",
            background: "#fff",
            color: "#111",
            fontSize: 13,
          }}
        >
          ← Назад
        </Link>

        <div style={{ marginTop: 12, fontSize: 16 }}>{title}</div>
        <div style={{ marginTop: 6, color: "#555", fontSize: 13 }}>
          Воронка: <b>{client.funnelStage.funnel.name}</b> → {client.funnelStage.name}
        </div>
        <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, color: "#666" }}>Модель септика</div>
          <select
            value={client.septicModelId ?? client.septicModel?.id ?? ""}
            onChange={async (e) => {
              const septicModelId = e.target.value || null;
              setClient((c) => ({
                ...c,
                septicModelId,
                septicModel: septicModelId
                  ? septicModels.find((m) => m.id === septicModelId) ?? null
                  : null,
              }));
              setSavingClient(true);
              try {
                const res = await fetch("/api/clients/update", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ clientId: client.id, septicModelId }),
                });
                if (!res.ok) throw new Error("update failed");
              } catch {
                alert("Не удалось сохранить модель септика");
              } finally {
                setSavingClient(false);
              }
            }}
            style={{
              height: 40,
              borderRadius: 12,
              border: "1px solid #ededed",
              padding: "0 10px",
              background: "#fff",
              opacity: savingClient ? 0.7 : 1,
            }}
          >
            <option value="">—</option>
            {septicModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, color: "#666" }}>Телефон</div>
          <input
            value={client.phone ?? ""}
            onChange={(e) => setClient((c) => ({ ...c, phone: e.target.value }))}
            onBlur={async () => {
              setSavingClient(true);
              try {
                const res = await fetch("/api/clients/update", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({
                    clientId: client.id,
                    phone: (client.phone ?? "").trim() || null,
                  }),
                });
                if (!res.ok) throw new Error("update failed");
              } catch {
                alert("Не удалось сохранить телефон");
              } finally {
                setSavingClient(false);
              }
            }}
            placeholder="+7..."
            style={{
              height: 40,
              borderRadius: 12,
              border: "1px solid #ededed",
              padding: "0 12px",
              outline: "none",
              fontSize: 13,
              background: "#fff",
              opacity: savingClient ? 0.7 : 1,
            }}
          />
        </div>
        <div style={{ marginTop: 10, color: "#555", fontSize: 13 }}>
          Комментарий: <b>{client.shortComment || "—"}</b>
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, color: "#666" }}>Комментарий</div>
          <textarea
            value={client.shortComment ?? ""}
            onChange={(e) => setClient((c) => ({ ...c, shortComment: e.target.value }))}
            onBlur={async () => {
              setSavingClient(true);
              try {
                const res = await fetch("/api/clients/update", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({
                    clientId: client.id,
                    shortComment: (client.shortComment ?? "").trim() || "",
                  }),
                });
                if (!res.ok) throw new Error("update failed");
              } catch {
                alert("Не удалось сохранить комментарий");
              } finally {
                setSavingClient(false);
              }
            }}
            placeholder="Комментарий..."
            style={{
              minHeight: 70,
              resize: "none",
              padding: 12,
              outline: "none",
              fontSize: 13,
              opacity: savingClient ? 0.7 : 1,
            }}
          />
        </div>

        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          <div style={{ fontSize: 12, color: "#666" }}>Иконки статусов</div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, color: "#666" }}>Квалификация</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={async () => {
                  const next = !client.qualified;
                  setClient((c) => ({ ...c, qualified: next }));
                  setSavingClient(true);
                  try {
                    const res = await fetch("/api/clients/update", {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ clientId: client.id, qualified: next }),
                    });
                    if (!res.ok) throw new Error("update failed");
                  } catch {
                    alert("Не удалось сохранить квалификацию");
                  } finally {
                    setSavingClient(false);
                  }
                }}
                style={{
                  height: 36,
                  padding: "0 12px",
                  borderRadius: 8,
                  border: "1px solid #ededed",
                  background: "#fff",
                  color: "#111",
                  cursor: "pointer",
                  opacity: savingClient ? 0.7 : 1,
                }}
              >
                {client.qualified ? "Квалифицирован" : "Не квалифицирован"}
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, color: "#666" }}>Статус</div>
            <select
              value={client.moneyProgress}
              onChange={async (e) => {
                const moneyProgress = e.target.value as ClientDetailModel["moneyProgress"];
                setClient((c) => ({ ...c, moneyProgress }));
                setSavingClient(true);
                try {
                  const res = await fetch("/api/clients/update", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ clientId: client.id, moneyProgress }),
                  });
                  if (!res.ok) throw new Error("update failed");
                } catch {
                  alert("Не удалось сохранить статус");
                } finally {
                  setSavingClient(false);
                }
              }}
              style={{
                height: 40,
                borderRadius: 8,
                border: "1px solid #ededed",
                padding: "0 10px",
                background: "#fff",
                opacity: savingClient ? 0.7 : 1,
              }}
            >
              <option value="ASSIGNED">Назначен</option>
              <option value="CONFIRMED">Подтверждён</option>
              <option value="DONE_WITH_MONEY">Состоялся с деньгами</option>
              <option value="DONE_WITHOUT_MONEY">Состоялся без денег</option>
            </select>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, color: "#666" }}>ГСО</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={async () => {
                  const gsoType: ClientDetailModel["gsoType"] = "GSO1";
                  setClient((c) => ({ ...c, gsoType }));
                  setSavingClient(true);
                  try {
                    const res = await fetch("/api/clients/update", {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ clientId: client.id, gsoType }),
                    });
                    if (!res.ok) throw new Error("update failed");
                  } catch {
                    alert("Не удалось сохранить ГСО");
                  } finally {
                    setSavingClient(false);
                  }
                }}
                style={{
                  height: 36,
                  padding: "0 12px",
                  borderRadius: 8,
                  border: "1px solid #ededed",
                  background: client.gsoType === "GSO1" ? "#f3f6ff" : "#fff",
                  color: "#111",
                  cursor: "pointer",
                  opacity: savingClient ? 0.7 : 1,
                }}
              >
                ГСО 1
              </button>
              <button
                type="button"
                onClick={async () => {
                  const gsoType: ClientDetailModel["gsoType"] = "GSO2";
                  setClient((c) => ({ ...c, gsoType }));
                  setSavingClient(true);
                  try {
                    const res = await fetch("/api/clients/update", {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ clientId: client.id, gsoType }),
                    });
                    if (!res.ok) throw new Error("update failed");
                  } catch {
                    alert("Не удалось сохранить ГСО");
                  } finally {
                    setSavingClient(false);
                  }
                }}
                style={{
                  height: 36,
                  padding: "0 12px",
                  borderRadius: 8,
                  border: "1px solid #ededed",
                  background: client.gsoType === "GSO2" ? "#f3f6ff" : "#fff",
                  color: "#111",
                  cursor: "pointer",
                  opacity: savingClient ? 0.7 : 1,
                }}
              >
                ГСО 2
              </button>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14, display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, color: "#666" }}>Ответственный</div>
          <select
            disabled={!canReassign}
            value={client.assignedManagerId ?? ""}
            onChange={async (e) => {
              const assignedManagerId = e.target.value || null;
              setClient((c) => ({ ...c, assignedManagerId }));
              if (!canReassign) return;
              await fetch("/api/clients/assign", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ clientId: client.id, assignedManagerId }),
              }).then(async (r) => {
                if (!r.ok) throw new Error("assign failed");
                const json = await r.json();
                setClient((c) => ({
                  ...c,
                  assignedManagerId: json.assignedManagerId,
                  assignedManager: json.assignedManager,
                }));
              });
            }}
            style={{
              height: 40,
              borderRadius: 10,
              border: "1px solid #ededed",
              padding: "0 10px",
              background: canReassign ? "#fff" : "#fafafa",
            }}
          >
            <option value="">—</option>
            {managers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName} ({u.role === "ADMIN" ? "Админ" : "Менеджер"})
              </option>
            ))}
          </select>
          {!canReassign ? (
            <div style={{ fontSize: 12, color: "#888" }}>
              Менеджер не может менять ответственного.
            </div>
          ) : null}
        </div>
      </aside>

      <main
        style={{
          background: "#fff",
          borderRadius: 14,
          border: "1px solid #eee",
          padding: 14,
          height: "calc(100vh - 64px - 32px)",
          display: "grid",
          gridTemplateRows: "1fr auto",
          overflow: "hidden",
        }}
      >
        <div style={{ overflow: "auto", paddingRight: 4 }}>
          {client.communications.length === 0 ? (
            <div style={{ color: "#777", fontSize: 13, padding: 8 }}>
              Пока нет записей.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {client.communications.map((m) => (
                <div
                  key={m.id}
                  style={{
                    border: "1px solid #ededed",
                    borderRadius: 12,
                    padding: 12,
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ fontWeight: 800, fontSize: 13, color: "#111" }}>
                      {m.author.firstName} {m.author.lastName}
                    </div>
                    <div style={{ fontSize: 12, color: "#666" }}>
                      {formatRuDayMonthWeekday(new Date(m.communicationDate))}
                    </div>
                  </div>
                  {m.text ? <div style={{ fontSize: 13, color: "#222" }}>{m.text}</div> : null}
                  {m.photos.length ? (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
                        gap: 10,
                        marginTop: 2,
                      }}
                    >
                      {m.photos.map((p) => (
                        <AttachmentThumb
                          key={p.id}
                          webpKey={p.webpKey}
                          originalKey={p.originalKey}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (saving) return;
            setSaving(true);

            const now = new Date();
            const commDate = new Date(date);
            if (commDate.getTime() > now.getTime()) {
              alert("Нельзя поставить будущую дату коммуникации");
              setSaving(false);
              return;
            }

            try {
              const photos: Array<{ originalKey: string; webpKey: string }> = [];
              for (const f of files) {
                const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
                const originalPresign = await presignUpload({
                  purpose: "communicationPhoto",
                  variant: "original",
                  contentType: f.type || "application/octet-stream",
                  ext,
                });

                const webpBlob = await fileToWebpBlob(f);
                const webpPresign = await presignUpload({
                  purpose: "communicationPhoto",
                  variant: "webp",
                  contentType: "image/webp",
                  ext: "webp",
                });

                await putObject(originalPresign.uploadUrl, f);
                await putObject(webpPresign.uploadUrl, webpBlob);

                photos.push({
                  originalKey: originalPresign.key,
                  webpKey: webpPresign.key,
                });
              }

              const res = await fetch("/api/clients/communication", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  clientId: client.id,
                  text,
                  communicationDate: commDate.toISOString(),
                  photos,
                }),
              });
              if (!res.ok) throw new Error("save failed");
              const json = await res.json();
              setClient((c) => ({ ...c, communications: [...c.communications, json.communication] }));
              setText("");
              setFiles([]);
            } catch {
              alert("Не удалось сохранить запись");
            } finally {
              setSaving(false);
            }
          }}
          style={{
            borderTop: "1px solid #eee",
            paddingTop: 12,
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <CalendarPopover value={date} onChange={setDate} />
            <label
              style={{
                height: 36,
                padding: "0 12px",
                borderRadius: 10,
                border: "1px solid #ededed",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                fontSize: 13,
                color: "#111",
                background: "#fff",
              }}
            >
              + Фото
              <input
                type="file"
                accept="image/*"
                multiple
                style={{ display: "none" }}
                onChange={(e) => {
                  const list = Array.from(e.target.files ?? []);
                  setFiles(list);
                }}
              />
            </label>
            {files.length ? (
              <div style={{ fontSize: 12, color: "#666" }}>{files.length} файл(ов)</div>
            ) : null}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Запись по клиенту..."
            style={{
              minHeight: 76,
              resize: "none",
              borderRadius: 12,
              border: "1px solid #ededed",
              padding: 12,
              outline: "none",
              fontSize: 13,
            }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="submit"
              className="ms-primaryBtn"
              disabled={saving}
              style={{
                height: 40,
                padding: "0 14px",
                borderRadius: 12,
                border: "none",
                background: "#111",
                color: "#fff",
                fontWeight: 800,
                cursor: "pointer",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Сохраняем..." : "Добавить запись"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

