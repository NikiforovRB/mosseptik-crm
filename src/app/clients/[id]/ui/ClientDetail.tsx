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
  const [deletingDeal, setDeletingDeal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, color: "#666" }}>Имя</div>
            <input
              value={client.firstName}
              onChange={(e) => setClient((c) => ({ ...c, firstName: e.target.value }))}
              style={{ height: 40, padding: "0 12px", outline: "none", fontSize: 13 }}
            />
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, color: "#666" }}>Фамилия</div>
            <input
              value={client.lastName}
              onChange={(e) => setClient((c) => ({ ...c, lastName: e.target.value }))}
              style={{ height: 40, padding: "0 12px", outline: "none", fontSize: 13 }}
            />
          </div>
        </div>

        <div style={{ marginTop: 6, color: "#555", fontSize: 13 }}>
          Воронка: <b>{client.funnelStage.funnel.name}</b> → {client.funnelStage.name}
        </div>
        <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, color: "#666" }}>Модель септика</div>
          <select
            value={client.septicModelId ?? client.septicModel?.id ?? ""}
            onChange={(e) => {
              const septicModelId = e.target.value || null;
              setClient((c) => ({
                ...c,
                septicModelId,
                septicModel: septicModelId
                  ? septicModels.find((m) => m.id === septicModelId) ?? null
                  : null,
              }));
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
        <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, color: "#666" }}>Комментарий</div>
          <textarea
            value={client.shortComment ?? ""}
            onChange={(e) => setClient((c) => ({ ...c, shortComment: e.target.value }))}
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
                onClick={() => {
                  const next = !client.qualified;
                  setClient((c) => ({ ...c, qualified: next }));
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
              onChange={(e) => {
                const moneyProgress = e.target.value as ClientDetailModel["moneyProgress"];
                setClient((c) => ({ ...c, moneyProgress }));
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
                onClick={() => {
                  const gsoType: ClientDetailModel["gsoType"] = "GSO1";
                  setClient((c) => ({ ...c, gsoType }));
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
                onClick={() => {
                  const gsoType: ClientDetailModel["gsoType"] = "GSO2";
                  setClient((c) => ({ ...c, gsoType }));
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
            onChange={(e) => {
              const assignedManagerId = e.target.value || null;
              const selectedManager =
                managers.find((m) => m.id === assignedManagerId) ?? null;
              setClient((c) => ({
                ...c,
                assignedManagerId,
                assignedManager: selectedManager
                  ? {
                      id: selectedManager.id,
                      firstName: selectedManager.firstName,
                      lastName: selectedManager.lastName,
                    }
                  : null,
              }));
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

        <div style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <button
            type="button"
            className="ms-primaryBtn"
            disabled={savingClient}
            onClick={async () => {
              setSavingClient(true);
              try {
                const res = await fetch("/api/clients/update", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({
                    clientId: client.id,
                    firstName: client.firstName.trim() || "—",
                    lastName: client.lastName.trim() || "",
                    phone: (client.phone ?? "").trim() || null,
                    septicModelId: client.septicModelId ?? client.septicModel?.id ?? null,
                    shortComment: client.shortComment ?? "",
                    qualified: client.qualified,
                    moneyProgress: client.moneyProgress,
                    gsoType: client.gsoType,
                    assignedManagerId: canReassign ? (client.assignedManagerId ?? null) : undefined,
                  }),
                });
                if (!res.ok) throw new Error("update failed");
                alert("Сохранено");
              } catch {
                alert("Не удалось сохранить изменения");
              } finally {
                setSavingClient(false);
              }
            }}
            style={{
              height: 40,
              padding: "0 14px",
              borderRadius: 10,
              border: "none",
              fontSize: 13,
              cursor: "pointer",
              opacity: savingClient ? 0.7 : 1,
            }}
          >
            {savingClient ? "Сохранение..." : "Сохранить"}
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              height: 40,
              padding: "0 14px",
              borderRadius: 10,
              border: "1px solid #ffd6d6",
              background: "#fff",
              color: "#c62828",
              fontSize: 13,
              cursor: "pointer",
              opacity: deletingDeal ? 0.7 : 1,
            }}
          >
            Удалить сделку
          </button>
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

      {showDeleteConfirm ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "grid",
            placeItems: "center",
            zIndex: 60,
          }}
        >
          <div
            style={{
              width: "min(460px, calc(100vw - 32px))",
              background: "#fff",
              borderRadius: 12,
              border: "1px solid #eee",
              padding: 14,
              display: "grid",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 16, color: "#111" }}>Удалить сделку?</div>
            <div style={{ fontSize: 13, color: "#666" }}>
              Сделка и все записи коммуникаций будут удалены. Контакт (имя, фамилия, телефон) останется.
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                style={{ height: 36, padding: "0 12px", border: "1px solid #ddd", background: "#fff" }}
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={deletingDeal}
                onClick={async () => {
                  setDeletingDeal(true);
                  try {
                    const res = await fetch("/api/clients/delete-deal", {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ clientId: client.id }),
                    });
                    if (!res.ok) throw new Error("delete failed");
                    window.location.href = "/clients";
                  } catch {
                    alert("Не удалось удалить сделку");
                    setDeletingDeal(false);
                    setShowDeleteConfirm(false);
                  }
                }}
                style={{
                  height: 36,
                  padding: "0 12px",
                  border: "none",
                  background: "#c62828",
                  color: "#fff",
                }}
              >
                {deletingDeal ? "Удаляем..." : "Удалить"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

