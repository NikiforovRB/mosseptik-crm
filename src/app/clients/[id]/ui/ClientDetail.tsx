"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { formatRuDayMonthWeekday, buildDueIsoMoscow, formatMoscowTime24, moscowWallDateToLocalCalendarDate } from "@/lib/date";
import { MONEY_PROGRESS_ICON_SRC } from "@/lib/moneyProgressIcons";
import CalendarPopover from "@/components/CalendarPopover";
import TaskDuePopover from "@/components/TaskDuePopover";
import { fileToWebpBlob } from "@/lib/image";
import { presignUpload, putObjectWithProgress } from "@/lib/upload";
import AttachmentThumb from "@/components/AttachmentThumb";
import ImageLightbox from "@/components/ImageLightbox";
import { useDismissOnOutsideClick } from "@/hooks/useDismissOnOutsideClick";

type UserLite = { id: string; firstName: string; lastName: string; role: string };
type SepticModelLite = { id: string; name: string };
type FunnelStagePickOption = { id: string; name: string; headerColor: string; funnelName: string };

type NextTaskModel = {
  id: string;
  dueAt: string | null;
  dueHasTime: boolean;
  assigneeId: string;
  assignee: { id: string; firstName: string; lastName: string };
};

type ClientDetailModel = {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  phone?: string | null;
  shortComment: string;
  requisites: string;
  septicModel: { id: string; name: string } | null;
  septicModelId?: string | null;
  assignedManagerId: string | null;
  assignedManager: { id: string; firstName: string; lastName: string } | null;
  qualified: boolean | null;
  moneyProgress: "ASSIGNED" | "CONFIRMED" | "DONE_WITH_MONEY" | "DONE_WITHOUT_MONEY" | null;
  gsoType: "GSO1" | "GSO2" | null;
  isUrgent: boolean;
  funnelStage: { id: string; name: string; headerColor: string; funnel: { name: string } };
  nextTask: NextTaskModel | null;
  communications: Array<{
    id: string;
    kind: "STANDARD" | "TASK_COMPLETED";
    taskAssigneeLabel: string | null;
    text: string;
    createdAt: string;
    communicationDate: string;
    author: { id: string; firstName: string; lastName: string; role: string };
    photos: Array<{ id: string; originalKey: string; webpKey: string; createdAt: string }>;
  }>;
};

/** Local wall time HH:mm for datetime edit (matches CalendarPopover day cells). */
function localHM(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const BTN_IDLE = "#666666";
const BTN_ACTIVE = "#0f68e4";
const BTN_ACTIVE_HOVER = "#337fe8";

function clientPayload(c: ClientDetailModel) {
  return JSON.stringify({
    firstName: c.firstName,
    lastName: c.lastName,
    middleName: c.middleName ?? "",
    phone: c.phone ?? "",
    shortComment: c.shortComment ?? "",
    septicModelId: c.septicModelId ?? c.septicModel?.id ?? "",
    qualified: c.qualified,
    moneyProgress: c.moneyProgress,
    gsoType: c.gsoType,
    assignedManagerId: c.assignedManagerId ?? "",
  });
}

function formatPhoneLine(phone: string | null | undefined): string {
  const raw = (phone ?? "").replace(/\D/g, "");
  if (!raw) return "—";
  if (raw.length === 11 && raw.startsWith("8")) {
    return `8 ${raw.slice(1, 4)} ${raw.slice(4, 7)}-${raw.slice(7, 9)}-${raw.slice(9, 11)}`;
  }
  return (phone ?? "").trim() || "—";
}

export default function ClientDetail({
  client: initialClient,
  users,
  septicModels,
  funnelStageOptions,
  canReassign,
  currentUserId,
}: {
  client: ClientDetailModel;
  users: UserLite[];
  septicModels: SepticModelLite[];
  funnelStageOptions: FunnelStagePickOption[];
  canReassign: boolean;
  currentUserId: string;
}) {
  const [client, setClient] = useState<ClientDetailModel>(() => ({
    ...initialClient,
    requisites: initialClient.requisites ?? "",
  }));
  const [savedKey, setSavedKey] = useState(() => clientPayload(initialClient));
  const [text, setText] = useState("");
  const [date, setDate] = useState<Date>(() => new Date());
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [savingClient, setSavingClient] = useState(false);
  const [deletingDeal, setDeletingDeal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editNames, setEditNames] = useState(false);
  const [editPhone, setEditPhone] = useState(false);
  const [nameRowHover, setNameRowHover] = useState(false);
  const [phoneRowHover, setPhoneRowHover] = useState(false);
  const [saveFooterHover, setSaveFooterHover] = useState(false);
  const [addRecordHover, setAddRecordHover] = useState(false);
  const [backHover, setBackHover] = useState(false);
  const [addTaskHover, setAddTaskHover] = useState(false);
  const [deleteTaskHover, setDeleteTaskHover] = useState(false);
  const [executeHover, setExecuteHover] = useState(false);
  const [funnelPickerOpen, setFunnelPickerOpen] = useState(false);
  const [stageMoveBusy, setStageMoveBusy] = useState(false);
  const funnelPickerRef = useRef<HTMLDivElement>(null);
  const closeFunnelPicker = useCallback(() => setFunnelPickerOpen(false), []);
  useDismissOnOutsideClick(funnelPickerOpen, closeFunnelPicker, funnelPickerRef);

  const [reqModalOpen, setReqModalOpen] = useState(false);
  const [reqDraft, setReqDraft] = useState("");
  const [reqBtnHover, setReqBtnHover] = useState(false);
  const [reqSaving, setReqSaving] = useState(false);
  const requisitesTextareaRef = useRef<HTMLTextAreaElement>(null);
  const feedScrollRef = useRef<HTMLDivElement>(null);
  const [commEdit, setCommEdit] = useState<{
    id: string;
    text: string;
    date: Date;
    kind: "STANDARD" | "TASK_COMPLETED";
    /** HH:mm local; only for TASK_COMPLETED edit */
    editTimeLocal?: string;
  } | null>(null);
  const [commBusy, setCommBusy] = useState(false);
  const [lightbox, setLightbox] = useState<{ originalKeys: string[]; startIndex: number } | null>(null);
  const [taskResult, setTaskResult] = useState("");
  const [taskBusy, setTaskBusy] = useState(false);
  const taskResultRef = useRef<HTMLTextAreaElement>(null);

  const [taskDue, setTaskDue] = useState<Date>(() => new Date());
  const [taskHasTime, setTaskHasTime] = useState(false);
  const [taskTime, setTaskTime] = useState("");

  useEffect(() => {
    const t = client.nextTask;
    if (!t) {
      setTaskHasTime(false);
      setTaskDue(new Date());
      setTaskTime("");
      setTaskResult("");
      return;
    }
    setTaskHasTime(t.dueHasTime);
    if (t.dueAt) {
      const instant = new Date(t.dueAt);
      setTaskDue(moscowWallDateToLocalCalendarDate(instant));
      if (t.dueHasTime) setTaskTime(formatMoscowTime24(instant));
      else setTaskTime("");
    } else {
      setTaskDue(new Date());
      setTaskTime("");
    }
  }, [client.nextTask?.id]);

  useEffect(() => {
    const el = taskResultRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(40, el.scrollHeight)}px`;
  }, [taskResult, client.nextTask?.id]);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  useLayoutEffect(() => {
    const el = feedScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [client.id, client.communications.length]);

  useEffect(() => {
    if (!reqModalOpen) return;
    const t = requisitesTextareaRef.current;
    if (!t) return;
    t.style.height = "auto";
    t.style.height = `${Math.min(480, Math.max(72, t.scrollHeight))}px`;
  }, [reqModalOpen, reqDraft]);

  const hasSavedRequisites = (client.requisites ?? "").trim().length > 0;

  const displayName = useMemo(
    () =>
      [client.firstName, client.middleName, client.lastName]
        .map((s) => (s ?? "").trim())
        .filter(Boolean)
        .join(" ") || "—",
    [client.firstName, client.middleName, client.lastName]
  );

  const managers = useMemo(
    () => users.filter((u) => u.role === "MANAGER" || u.role === "ADMIN"),
    [users]
  );

  const sectionBackHref = useMemo(() => {
    const n = (client.funnelStage.funnel.name ?? "").toLowerCase();
    const section = n.includes("сервис") ? "service" : "montazh";
    return `/?section=${section}`;
  }, [client.funnelStage.funnel.name]);

  const isClientDirty = clientPayload(client) !== savedKey;
  const isCommDirty = text.trim().length > 0 || files.length > 0;

  const patchNextTask = async (patch: { dueAt?: string | null; dueHasTime?: boolean }) => {
    const res = await fetch("/api/clients/next-task", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clientId: client.id, ...patch }),
    });
    if (!res.ok) return;
    const json = await res.json();
    setClient((c) => ({ ...c, nextTask: json.task }));
  };

  const saveCommunicationEdit = async () => {
    if (!commEdit) return;
    setCommBusy(true);
    try {
      const res = await fetch(`/api/clients/communication/${commEdit.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text: commEdit.text,
          communicationDate: commEdit.date.toISOString(),
        }),
      });
      if (!res.ok) throw new Error("fail");
      const json = await res.json();
      const u = json.communication as ClientDetailModel["communications"][0];
      setClient((c) => ({
        ...c,
        communications: c.communications.map((x) => (x.id === u.id ? { ...x, ...u } : x)),
      }));
      setCommEdit(null);
    } catch {
      alert("Не удалось сохранить запись");
    } finally {
      setCommBusy(false);
    }
  };

  const deleteCommunication = async (id: string) => {
    if (!confirm("Удалить запись?")) return;
    setCommBusy(true);
    try {
      const res = await fetch(`/api/clients/communication/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("fail");
      setClient((c) => ({ ...c, communications: c.communications.filter((x) => x.id !== id) }));
      setCommEdit((e) => (e?.id === id ? null : e));
    } catch {
      alert("Не удалось удалить запись");
    } finally {
      setCommBusy(false);
    }
  };

  const deleteCommPhoto = async (communicationId: string, photoId: string) => {
    try {
      const res = await fetch(`/api/clients/communication-photo/${photoId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("fail");
      setLightbox(null);
      setClient((c) => ({
        ...c,
        communications: c.communications.map((x) =>
          x.id === communicationId ? { ...x, photos: x.photos.filter((ph) => ph.id !== photoId) } : x
        ),
      }));
    } catch {
      alert("Не удалось удалить фото");
    }
  };

  const openCommLightbox = (m: ClientDetailModel["communications"][0], index: number) => {
    if (m.photos.length === 0) return;
    setLightbox({
      originalKeys: m.photos.map((p) => p.originalKey),
      startIndex: index,
    });
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(280px, 30%) 1px 1fr",
        gap: 0,
        padding: 0,
        alignItems: "stretch",
      }}
    >
      <aside
        style={{
          display: "flex",
          flexDirection: "column",
          height: "calc(100vh - 64px)",
          background: "#fff",
          overflow: "hidden",
        }}
      >
        <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "14px 20px" }}>
          <Link
            href={sectionBackHref}
            onMouseEnter={() => setBackHover(true)}
            onMouseLeave={() => setBackHover(false)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              height: 34,
              padding: "0 4px 0 0",
              border: "none",
              background: "transparent",
              color: backHover ? "#5A86EE" : "#666666",
              fontSize: 13,
              textDecoration: "none",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={backHover ? "/src/icons/left-nav.svg" : "/src/icons/left.svg"} alt="" width={18} height={18} />
            Назад
          </Link>

          <div ref={funnelPickerRef} style={{ position: "relative", marginTop: 10 }}>
            <button
              type="button"
              disabled={stageMoveBusy}
              onClick={() => setFunnelPickerOpen((o) => !o)}
              style={{
                width: "100%",
                textAlign: "left",
                border: "none",
                background: "transparent",
                padding: "2px 0",
                cursor: stageMoveBusy ? "wait" : "pointer",
                fontSize: 16,
                color: "#000",
              }}
            >
              Воронка:{" "}
              <span style={{ fontWeight: 800 }}>{client.funnelStage.funnel.name}</span>
              {" → "}
              <span style={{ fontWeight: 800 }}>{client.funnelStage.name}</span>
            </button>
            <div
              style={{
                marginTop: 6,
                height: 2,
                background: client.funnelStage.headerColor || "#ccd0e1",
                borderRadius: 0,
              }}
            />
            {funnelPickerOpen ? (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: "100%",
                  marginTop: 8,
                  zIndex: 40,
                  background: "#fff",
                  border: "1px solid #ededed",
                  borderRadius: 12,
                  boxShadow: "0 14px 36px rgba(0,0,0,0.12)",
                  maxHeight: 320,
                  overflowY: "auto",
                  padding: 6,
                }}
              >
                {funnelStageOptions.map((opt) => {
                  const active = opt.id === client.funnelStage.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={stageMoveBusy}
                      onClick={async () => {
                        if (opt.id === client.funnelStage.id) {
                          setFunnelPickerOpen(false);
                          return;
                        }
                        setStageMoveBusy(true);
                        try {
                          const res = await fetch("/api/clients/update", {
                            method: "POST",
                            headers: { "content-type": "application/json" },
                            body: JSON.stringify({
                              clientId: client.id,
                              funnelStageId: opt.id,
                            }),
                          });
                          if (!res.ok) throw new Error("fail");
                          setClient((c) => ({
                            ...c,
                            funnelStage: {
                              id: opt.id,
                              name: opt.name,
                              headerColor: opt.headerColor,
                              funnel: { name: opt.funnelName },
                            },
                          }));
                          setFunnelPickerOpen(false);
                        } catch {
                          alert("Не удалось сменить этап воронки");
                        } finally {
                          setStageMoveBusy(false);
                        }
                      }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 12px",
                        border: "none",
                        borderRadius: 8,
                        background: active ? "#f3f6ff" : "transparent",
                        cursor: stageMoveBusy ? "wait" : "pointer",
                        textAlign: "left",
                        fontSize: 13,
                        color: "#111",
                      }}
                      onMouseEnter={(e) => {
                        if (!active) e.currentTarget.style.background = "#f7f7f7";
                      }}
                      onMouseLeave={(e) => {
                        if (!active) e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          background: opt.headerColor || "#ccd0e1",
                          flexShrink: 0,
                          border: "1px solid rgba(0,0,0,0.06)",
                        }}
                        aria-hidden
                      />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ color: "#666" }}>{opt.funnelName}</span>
                        {" → "}
                        <span style={{ fontWeight: 800 }}>{opt.name}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 4 }}>
            <div style={{ fontSize: 12, color: "#666" }}>Клиент</div>
            <div
              style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 28, width: "100%" }}
              onMouseEnter={() => setNameRowHover(true)}
              onMouseLeave={() => setNameRowHover(false)}
            >
              <div style={{ fontSize: 16, color: "#111", flex: 1, minWidth: 0 }}>{displayName}</div>
              <button
                type="button"
                title="Редактировать ФИО"
                onClick={() => setEditNames((v) => !v)}
                style={{
                  width: 24,
                  height: 24,
                  padding: 0,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  opacity: nameRowHover ? 1 : 0,
                  transition: "opacity 120ms ease",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={nameRowHover ? "/src/icons/edit-nav.svg" : "/src/icons/edit.svg"}
                  alt=""
                  width={18}
                  height={18}
                />
              </button>
            </div>
          </div>

          {editNames ? (
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              <div style={{ display: "grid", gap: 4 }}>
                <div style={{ fontSize: 12, color: "#666" }}>Имя</div>
                <input
                  value={client.firstName}
                  onChange={(e) => setClient((c) => ({ ...c, firstName: e.target.value }))}
                  style={{ height: 40, padding: "0 12px", outline: "none", fontSize: 13 }}
                />
              </div>
              <div style={{ display: "grid", gap: 4 }}>
                <div style={{ fontSize: 12, color: "#666" }}>Отчество</div>
                <input
                  value={client.middleName ?? ""}
                  onChange={(e) => setClient((c) => ({ ...c, middleName: e.target.value }))}
                  style={{ height: 40, padding: "0 12px", outline: "none", fontSize: 13 }}
                />
              </div>
              <div style={{ display: "grid", gap: 4 }}>
                <div style={{ fontSize: 12, color: "#666" }}>Фамилия</div>
                <input
                  value={client.lastName}
                  onChange={(e) => setClient((c) => ({ ...c, lastName: e.target.value }))}
                  style={{ height: 40, padding: "0 12px", outline: "none", fontSize: 13 }}
                />
              </div>
            </div>
          ) : null}

          <div style={{ marginTop: 12, display: "grid", gap: 4 }}>
            <div style={{ fontSize: 12, color: "#666" }}>Телефон</div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
              }}
              onMouseEnter={() => setPhoneRowHover(true)}
              onMouseLeave={() => setPhoneRowHover(false)}
            >
              <span style={{ fontSize: 16, color: "#111", flex: 1, minWidth: 0 }}>{formatPhoneLine(client.phone)}</span>
              <button
                type="button"
                title="Редактировать телефон"
                onClick={() => setEditPhone((v) => !v)}
                style={{
                  width: 24,
                  height: 24,
                  padding: 0,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  opacity: phoneRowHover ? 1 : 0,
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={phoneRowHover ? "/src/icons/edit-nav.svg" : "/src/icons/edit.svg"}
                  alt=""
                  width={18}
                  height={18}
                />
              </button>
            </div>
          </div>

          {editPhone ? (
            <div style={{ marginTop: 8 }}>
              <input
                value={client.phone ?? ""}
                onChange={(e) => setClient((c) => ({ ...c, phone: e.target.value }))}
                placeholder="+7..."
                style={{ height: 40, width: "100%", padding: "0 12px", outline: "none", fontSize: 13 }}
              />
            </div>
          ) : null}

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
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <Pill
                  active={client.qualified === false}
                  onClick={() => setClient((c) => ({ ...c, qualified: false }))}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/src/icons/not-active.svg" alt="" width={16} height={16} style={{ display: "block" }} />
                  <span style={{ marginLeft: 6 }}>Не квалифицирован</span>
                </Pill>
                <Pill
                  active={client.qualified === true}
                  onClick={() => setClient((c) => ({ ...c, qualified: true }))}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/src/icons/active.svg" alt="" width={16} height={16} style={{ display: "block" }} />
                  <span style={{ marginLeft: 6 }}>Квалифицирован</span>
                </Pill>
                <ResetStatusPill onClick={() => setClient((c) => ({ ...c, qualified: null }))} />
              </div>
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 12, color: "#666" }}>Статус</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {(
                  [
                    ["ASSIGNED", "Назначен"],
                    ["CONFIRMED", "Подтверждён"],
                    ["DONE_WITH_MONEY", "С деньгами"],
                    ["DONE_WITHOUT_MONEY", "Без денег"],
                  ] as const
                ).map(([v, label]) => (
                  <Pill
                    key={v}
                    active={client.moneyProgress === v}
                    onClick={() => setClient((c) => ({ ...c, moneyProgress: v }))}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={MONEY_PROGRESS_ICON_SRC[v]} alt="" width={16} height={16} style={{ display: "block" }} />
                    <span style={{ marginLeft: 6 }}>{label}</span>
                  </Pill>
                ))}
                <ResetStatusPill onClick={() => setClient((c) => ({ ...c, moneyProgress: null }))} />
              </div>
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 12, color: "#666" }}>ГСО</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <Pill
                  active={client.gsoType === "GSO1"}
                  onClick={() => setClient((c) => ({ ...c, gsoType: "GSO1" }))}
                >
                  ГСО 1
                </Pill>
                <Pill
                  active={client.gsoType === "GSO2"}
                  onClick={() => setClient((c) => ({ ...c, gsoType: "GSO2" }))}
                >
                  ГСО 2
                </Pill>
                <ResetStatusPill onClick={() => setClient((c) => ({ ...c, gsoType: null }))} />
              </div>
            </div>

            <button
              type="button"
              onMouseEnter={() => setReqBtnHover(true)}
              onMouseLeave={() => setReqBtnHover(false)}
              onClick={() => {
                setReqDraft(client.requisites ?? "");
                setReqModalOpen(true);
              }}
              style={{
                justifySelf: "start",
                marginTop: 10,
                marginBottom: 10,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                border: "none",
                background: "transparent",
                padding: 0,
                cursor: "pointer",
                fontSize: 13,
                color: reqBtnHover ? "#000000" : "#a4a4a4",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  hasSavedRequisites
                    ? "/src/icons/file-check.svg"
                    : reqBtnHover
                      ? "/src/icons/rekviziti-nav.svg"
                      : "/src/icons/rekviziti.svg"
                }
                alt=""
                width={18}
                height={18}
                style={{ display: "block", flexShrink: 0 }}
              />
              {hasSavedRequisites ? "Смотреть реквизиты" : "Добавить реквизиты"}
            </button>
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, color: "#666" }}>Ответственный</div>
            <select
              disabled={!canReassign}
              value={client.assignedManagerId ?? ""}
              onChange={(e) => {
                const assignedManagerId = e.target.value || null;
                const selectedManager = managers.find((m) => m.id === assignedManagerId) ?? null;
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
              <div style={{ fontSize: 12, color: "#888" }}>Менеджер не может менять ответственного.</div>
            ) : null}
          </div>
        </div>

        <div
          style={{
            flexShrink: 0,
            background: "#f3f3f1",
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <button
            type="button"
            disabled={savingClient || !isClientDirty}
            onMouseEnter={() => setSaveFooterHover(true)}
            onMouseLeave={() => setSaveFooterHover(false)}
            onClick={async () => {
              if (!isClientDirty || savingClient) return;
              setSavingClient(true);
              try {
                const res = await fetch("/api/clients/update", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({
                    clientId: client.id,
                    firstName: client.firstName.trim() || "—",
                    lastName: client.lastName.trim() || "",
                    middleName: (client.middleName ?? "").trim() || null,
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
                setSavedKey(clientPayload(client));
                setEditNames(false);
                setEditPhone(false);
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
              cursor: isClientDirty && !savingClient ? "pointer" : "default",
              opacity: savingClient ? 0.7 : 1,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              color: "#fff",
              background:
                !isClientDirty || savingClient
                  ? BTN_IDLE
                  : saveFooterHover
                    ? BTN_ACTIVE_HOVER
                    : BTN_ACTIVE,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/src/icons/save-white.svg" alt="" width={18} height={18} style={{ display: "block" }} />
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
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/src/icons/delete-nav.svg" alt="" width={18} height={18} style={{ display: "block" }} />
            Удалить сделку
          </button>
        </div>
      </aside>

      <div style={{ width: 1, background: "#c7c6c5", flexShrink: 0 }} aria-hidden />

      <main
        style={{
          background: "#fff",
          padding: "14px 20px 14px 20px",
          height: "calc(100vh - 64px)",
          display: "grid",
          gridTemplateRows: "1fr auto",
          overflow: "hidden",
        }}
      >
        <div ref={feedScrollRef} style={{ overflow: "auto" }}>
          {client.communications.length === 0 ? (
            <div style={{ color: "#777", fontSize: 13, padding: 8, paddingBottom: 100 }}>Пока нет записей.</div>
          ) : (
            <div style={{ display: "grid", gap: 10, paddingBottom: 100 }}>
              {client.communications.map((m) => {
                const editing = commEdit?.id === m.id;
                const isTaskDone = m.kind === "TASK_COMPLETED";
                return (
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
                    {editing && commEdit ? (
                      <div style={{ display: "grid", gap: 10 }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                          <CalendarPopover
                            value={commEdit.date}
                            onChange={(d) =>
                              setCommEdit((e) => {
                                if (!e) return e;
                                if (e.kind === "TASK_COMPLETED") {
                                  const tm = e.editTimeLocal ?? localHM(e.date);
                                  const [hh, mm] = tm.split(":").map((x) => parseInt(x, 10));
                                  const next = new Date(
                                    d.getFullYear(),
                                    d.getMonth(),
                                    d.getDate(),
                                    Number.isFinite(hh) ? hh : 0,
                                    Number.isFinite(mm) ? mm : 0,
                                    0,
                                    0,
                                  );
                                  return { ...e, date: next, editTimeLocal: tm };
                                }
                                return { ...e, date: d };
                              })
                            }
                          />
                          {isTaskDone ? (
                            <label
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 8,
                                height: 36,
                                padding: "0 12px",
                                borderRadius: 10,
                                border: "1px solid #ededed",
                                background: "#fff",
                                fontSize: 13,
                              }}
                            >
                              <span style={{ color: "#666", fontSize: 12 }}>Время</span>
                              <input
                                type="time"
                                step={60}
                                value={commEdit.editTimeLocal ?? localHM(commEdit.date)}
                                onChange={(ev) => {
                                  const v = ev.target.value;
                                  setCommEdit((prev) => {
                                    if (!prev || prev.kind !== "TASK_COMPLETED") return prev;
                                    const [hh, mm] = v.split(":").map((x) => parseInt(x, 10));
                                    const base = prev.date;
                                    const next = new Date(
                                      base.getFullYear(),
                                      base.getMonth(),
                                      base.getDate(),
                                      Number.isFinite(hh) ? hh : 0,
                                      Number.isFinite(mm) ? mm : 0,
                                      0,
                                      0,
                                    );
                                    return { ...prev, date: next, editTimeLocal: v };
                                  });
                                }}
                                style={{
                                  border: "none",
                                  background: "transparent",
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: "#111",
                                  outline: "none",
                                }}
                              />
                            </label>
                          ) : null}
                          <button
                            type="button"
                            disabled={commBusy}
                            onClick={() => void saveCommunicationEdit()}
                            style={{
                              height: 36,
                              padding: "0 12px",
                              borderRadius: 8,
                              border: "none",
                              background: "#0f68e4",
                              color: "#fff",
                              fontSize: 13,
                              cursor: commBusy ? "default" : "pointer",
                            }}
                          >
                            Сохранить
                          </button>
                          <button
                            type="button"
                            disabled={commBusy}
                            onClick={() => setCommEdit(null)}
                            style={{
                              height: 36,
                              padding: "0 12px",
                              borderRadius: 8,
                              border: "1px solid #ddd",
                              background: "#fff",
                              fontSize: 13,
                              cursor: commBusy ? "default" : "pointer",
                            }}
                          >
                            Отмена
                          </button>
                        </div>
                        <div style={{ fontSize: 12, color: "#666" }}>
                          {isTaskDone ? "Результат выполнения задачи" : "Текст"}
                        </div>
                        <textarea
                          value={commEdit.text}
                          onChange={(e) => setCommEdit((prev) => (prev ? { ...prev, text: e.target.value } : prev))}
                          style={{
                            minHeight: 80,
                            resize: "vertical",
                            padding: 10,
                            fontSize: 13,
                            borderRadius: 8,
                            border: "1px solid #ededed",
                          }}
                        />
                        {m.photos.length ? (
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
                              gap: 10,
                              marginTop: 2,
                            }}
                          >
                            {m.photos.map((p, i) => (
                              <AttachmentThumb
                                key={p.id}
                                webpKey={p.webpKey}
                                originalKey={p.originalKey}
                                onView={() => openCommLightbox(m, i)}
                                onDelete={() => void deleteCommPhoto(m.id, p.id)}
                              />
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : isTaskDone ? (
                      <>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/src/icons/active.svg" alt="" width={18} height={18} style={{ flexShrink: 0 }} />
                          <div style={{ fontWeight: 800, fontSize: 13, color: "#111" }}>Задача выполнена</div>
                        </div>
                        <div style={{ fontSize: 13, color: "#333" }}>
                          Задача выполнена. Ответственный: {m.taskAssigneeLabel ?? "—"}
                        </div>
                        <div style={{ fontSize: 13, color: "#222" }}>
                          <span style={{ color: "#666" }}>Результат: </span>
                          {m.text?.trim() ? m.text : "—"}
                        </div>
                        {m.photos.length ? (
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
                              gap: 10,
                              marginTop: 2,
                            }}
                          >
                            {m.photos.map((p, i) => (
                              <AttachmentThumb
                                key={p.id}
                                webpKey={p.webpKey}
                                originalKey={p.originalKey}
                                onView={() => openCommLightbox(m, i)}
                              />
                            ))}
                          </div>
                        ) : null}
                        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end", marginTop: 4 }}>
                          <CommFeedIconBtn
                            title="Редактировать"
                            disabled={commBusy}
                            icon="/src/icons/edit.svg"
                            iconHover="/src/icons/edit-nav.svg"
                            onClick={() => {
                              const d = new Date(m.communicationDate);
                              setCommEdit({
                                id: m.id,
                                text: m.text,
                                date: d,
                                kind: m.kind,
                                editTimeLocal: localHM(d),
                              });
                            }}
                          />
                          <CommFeedIconBtn
                            title="Удалить"
                            disabled={commBusy}
                            icon="/src/icons/delete.svg"
                            iconHover="/src/icons/delete-nav.svg"
                            onClick={() => void deleteCommunication(m.id)}
                          />
                        </div>
                      </>
                    ) : (
                      <>
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
                            {m.photos.map((p, i) => (
                              <AttachmentThumb
                                key={p.id}
                                webpKey={p.webpKey}
                                originalKey={p.originalKey}
                                onView={() => openCommLightbox(m, i)}
                              />
                            ))}
                          </div>
                        ) : null}
                        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end", marginTop: 4 }}>
                          <CommFeedIconBtn
                            title="Редактировать"
                            disabled={commBusy}
                            icon="/src/icons/edit.svg"
                            iconHover="/src/icons/edit-nav.svg"
                            onClick={() =>
                              setCommEdit({
                                id: m.id,
                                text: m.text,
                                date: new Date(m.communicationDate),
                                kind: m.kind,
                              })
                            }
                          />
                          <CommFeedIconBtn
                            title="Удалить"
                            disabled={commBusy}
                            icon="/src/icons/delete.svg"
                            iconHover="/src/icons/delete-nav.svg"
                            onClick={() => void deleteCommunication(m.id)}
                          />
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (saving || !isCommDirty) return;
            setSaving(true);
            setUploadPct(0);

            const now = new Date();
            const commDate = new Date(date);
            if (commDate.getTime() > now.getTime()) {
              alert("Нельзя поставить будущую дату коммуникации");
              setSaving(false);
              setUploadPct(null);
              return;
            }

            try {
              const photos: Array<{ originalKey: string; webpKey: string }> = [];
              const n = files.length;
              let step = 0;
              const totalSteps = n * 2;

              for (const f of files) {
                const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
                const originalPresign = await presignUpload({
                  purpose: "communicationPhoto",
                  variant: "original",
                  contentType: f.type || "application/octet-stream",
                  ext,
                });
                await putObjectWithProgress(originalPresign.uploadUrl, f, (p) => {
                  const base = (step / totalSteps) * 100;
                  setUploadPct(Math.round(base + p / totalSteps));
                });
                step += 1;

                const webpBlob = await fileToWebpBlob(f);
                const webpPresign = await presignUpload({
                  purpose: "communicationPhoto",
                  variant: "webp",
                  contentType: "image/webp",
                  ext: "webp",
                });
                await putObjectWithProgress(webpPresign.uploadUrl, webpBlob, (p) => {
                  const base = (step / totalSteps) * 100;
                  setUploadPct(Math.round(base + p / totalSteps));
                });
                step += 1;

                photos.push({
                  originalKey: originalPresign.key,
                  webpKey: webpPresign.key,
                });
              }

              setUploadPct(100);
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
              setUploadPct(null);
            }
          }}
          style={{
            paddingTop: 0,
            display: "grid",
            gap: 10,
          }}
        >
          <div
            aria-hidden
            style={{
              height: 1,
              background: "#c7c6c5",
              marginLeft: -20,
              marginRight: -20,
              width: "calc(100% + 40px)",
            }}
          />
          {!client.nextTask ? (
            <button
              type="button"
              disabled={taskBusy}
              onMouseEnter={() => setAddTaskHover(true)}
              onMouseLeave={() => setAddTaskHover(false)}
              onClick={async () => {
                setTaskBusy(true);
                try {
                  const res = await fetch("/api/clients/next-task", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                      clientId: client.id,
                      assigneeId: currentUserId,
                    }),
                  });
                  if (!res.ok) throw new Error("fail");
                  const json = await res.json();
                  setClient((c) => ({ ...c, nextTask: json.task }));
                  setTaskResult("");
                } catch {
                  alert("Не удалось добавить задачу");
                } finally {
                  setTaskBusy(false);
                }
              }}
              style={{
                height: 36,
                padding: "0 12px",
                borderRadius: 8,
                border: "none",
                background: "transparent",
                cursor: taskBusy ? "default" : "pointer",
                fontSize: 13,
                width: "fit-content",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                color: addTaskHover ? "#5A86EE" : "#666666",
                opacity: taskBusy ? 0.7 : 1,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={addTaskHover ? "/src/icons/addtask-nav.svg" : "/src/icons/addtask.svg"} alt="" width={18} height={18} />
              Добавить задачу
            </button>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              <div
                style={{
                  display: "flex",
                  flexWrap: "nowrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  minWidth: 0,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <TaskDuePopover
                  allowFuture
                  calendarDate={taskDue}
                  hasTime={taskHasTime}
                  timeHHmm={taskTime}
                  onApply={({ calendarDate, hasTime, timeHHmm }) => {
                    setTaskDue(calendarDate);
                    setTaskHasTime(hasTime);
                    setTaskTime(hasTime ? timeHHmm : "");
                    void (async () => {
                      const { dueAt, dueHasTime } = buildDueIsoMoscow(calendarDate, hasTime, hasTime ? timeHHmm : "");
                      await patchNextTask({ dueAt, dueHasTime });
                    })();
                  }}
                  />
                </div>
                <button
                  type="button"
                  disabled={taskBusy}
                  onMouseEnter={() => setDeleteTaskHover(true)}
                  onMouseLeave={() => setDeleteTaskHover(false)}
                  onClick={async () => {
                    if (!confirm("Удалить задачу?")) return;
                    setTaskBusy(true);
                    try {
                      const res = await fetch(`/api/clients/next-task?clientId=${encodeURIComponent(client.id)}`, {
                        method: "DELETE",
                      });
                      if (!res.ok) throw new Error("fail");
                      setClient((c) => ({ ...c, nextTask: null }));
                      setTaskResult("");
                    } catch {
                      alert("Не удалось удалить задачу");
                    } finally {
                      setTaskBusy(false);
                    }
                  }}
                  style={{
                    height: 36,
                    padding: "0 10px",
                    fontSize: 13,
                    border: "none",
                    background: "transparent",
                    borderRadius: 8,
                    cursor: taskBusy ? "default" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    color: deleteTaskHover ? "#F33737" : "#666666",
                    opacity: taskBusy ? 0.7 : 1,
                    flexShrink: 0,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={deleteTaskHover ? "/src/icons/delete-nav.svg" : "/src/icons/delete-black.svg"}
                    alt=""
                    width={18}
                    height={18}
                  />
                  Удалить задачу
                </button>
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ fontSize: 12, color: "#666" }}>Результат выполнения задачи</div>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <textarea
                    ref={taskResultRef}
                    value={taskResult}
                    onChange={(e) => setTaskResult(e.target.value)}
                    placeholder="Опишите результат..."
                    rows={1}
                    style={{
                      flex: 1,
                      minHeight: 40,
                      maxHeight: 240,
                      resize: "none",
                      overflow: "auto",
                      padding: 10,
                      fontSize: 13,
                      lineHeight: 1.35,
                      boxSizing: "border-box",
                    }}
                    onInput={(e) => {
                      const t = e.currentTarget;
                      t.style.height = "auto";
                      t.style.height = `${Math.min(240, Math.max(40, t.scrollHeight))}px`;
                    }}
                  />
                  <button
                    type="button"
                    disabled={taskBusy || !taskResult.trim()}
                    onMouseEnter={() => setExecuteHover(true)}
                    onMouseLeave={() => setExecuteHover(false)}
                    onClick={async () => {
                      setTaskBusy(true);
                      try {
                        const res = await fetch("/api/clients/next-task/complete", {
                          method: "POST",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify({
                            clientId: client.id,
                            resultText: taskResult.trim(),
                          }),
                        });
                        if (!res.ok) throw new Error("fail");
                        const json = await res.json();
                        setClient((c) => ({
                          ...c,
                          communications: [...c.communications, json.communication],
                          nextTask: null,
                        }));
                        setTaskResult("");
                      } catch {
                        alert("Не удалось выполнить задачу");
                      } finally {
                        setTaskBusy(false);
                      }
                    }}
                    style={{
                      height: 40,
                      padding: "0 14px",
                      borderRadius: 12,
                      border: "none",
                      color: "#fff",
                      fontWeight: 800,
                      fontSize: 13,
                      cursor: taskBusy || !taskResult.trim() ? "default" : "pointer",
                      flexShrink: 0,
                      background:
                        taskBusy || !taskResult.trim()
                          ? BTN_IDLE
                          : executeHover
                            ? BTN_ACTIVE_HOVER
                            : BTN_ACTIVE,
                    }}
                  >
                    Выполнить
                  </button>
                </div>
              </div>
            </div>
          )}

          <div style={{ height: 1, background: "#eee", margin: "4px 0" }} />

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

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
            <CalendarPopover value={date} onChange={setDate} />
            <label
              style={{
                height: 36,
                padding: "0 12px",
                borderRadius: 10,
                border: "1px solid #ededed",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                fontSize: 13,
                color: "#111",
                background: "#fff",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/src/icons/photo-black.svg" alt="" width={18} height={18} style={{ display: "block" }} />
              Добавить фото
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
          </div>

          {previews.length ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {previews.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={src}
                  src={src}
                  alt=""
                  style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: "1px solid #eee" }}
                />
              ))}
            </div>
          ) : null}

          {uploadPct !== null ? (
            <div style={{ display: "grid", gap: 4 }}>
              <div
                style={{
                  height: 8,
                  borderRadius: 4,
                  background: "#eee",
                  overflow: "hidden",
                }}
              >
                <div style={{ width: `${uploadPct}%`, height: "100%", background: "#0f68e4", transition: "width 120ms" }} />
              </div>
              <div style={{ fontSize: 12, color: "#666" }}>{uploadPct}%</div>
            </div>
          ) : null}

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="submit"
              disabled={saving || !isCommDirty}
              onMouseEnter={() => setAddRecordHover(true)}
              onMouseLeave={() => setAddRecordHover(false)}
              style={{
                height: 40,
                padding: "0 14px",
                borderRadius: 12,
                border: "none",
                color: "#fff",
                fontWeight: 800,
                cursor: isCommDirty && !saving ? "pointer" : "default",
                opacity: saving ? 0.7 : 1,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background:
                  !isCommDirty || saving
                    ? BTN_IDLE
                    : addRecordHover
                      ? BTN_ACTIVE_HOVER
                      : BTN_ACTIVE,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/src/icons/plus-white.svg" alt="" width={18} height={18} style={{ display: "block" }} />
              {saving ? "Сохраняем..." : "Добавить запись"}
            </button>
          </div>
        </form>
      </main>

      <ImageLightbox
        open={lightbox !== null}
        onClose={() => setLightbox(null)}
        originalKeys={lightbox?.originalKeys ?? []}
        startIndex={lightbox?.startIndex ?? 0}
      />

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

      {reqModalOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="requisites-modal-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setReqModalOpen(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "grid",
            placeItems: "center",
            padding: 20,
            zIndex: 55,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 520,
              background: "#fff",
              borderRadius: 16,
              padding: 24,
              display: "grid",
              gap: 14,
              border: "1px solid #eee",
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div id="requisites-modal-title" style={{ fontSize: 16, fontWeight: 900, color: "#111" }}>
              Реквизиты
            </div>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, color: "#666" }}>Реквизиты</span>
              <textarea
                ref={requisitesTextareaRef}
                value={reqDraft}
                onChange={(e) => setReqDraft(e.target.value)}
                onInput={(e) => {
                  const t = e.currentTarget;
                  t.style.height = "auto";
                  t.style.height = `${Math.min(480, Math.max(72, t.scrollHeight))}px`;
                }}
                placeholder="Введите реквизиты..."
                style={{
                  minHeight: 72,
                  maxHeight: 480,
                  resize: "none",
                  overflow: "auto",
                  padding: 12,
                  fontSize: 13,
                  lineHeight: 1.35,
                  borderRadius: 10,
                  border: "1px solid #ededed",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </label>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
              <button
                type="button"
                disabled={reqSaving}
                onClick={() => setReqModalOpen(false)}
                style={{
                  height: 38,
                  padding: "0 12px",
                  borderRadius: 10,
                  border: "1px solid #ededed",
                  background: "#fff",
                  color: "#111",
                  fontWeight: 900,
                  fontSize: 13,
                  cursor: reqSaving ? "default" : "pointer",
                }}
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={reqSaving}
                onClick={async () => {
                  setReqSaving(true);
                  try {
                    const res = await fetch("/api/clients/requisites", {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({
                        clientId: client.id,
                        requisites: reqDraft,
                      }),
                    });
                    if (!res.ok) {
                      const j = await res.json().catch(() => null);
                      const msg =
                        typeof j?.message === "string"
                          ? j.message
                          : typeof j?.error === "string"
                            ? j.error
                            : `ошибка ${res.status}`;
                      const hint =
                        String(msg).toLowerCase().includes("requisites") ||
                        String(msg).toLowerCase().includes("column")
                          ? " Убедитесь, что выполнена миграция 2026-04-07_client_requisites.sql и перезапущен dev-сервер после npx prisma generate."
                          : "";
                      alert(`Не удалось сохранить реквизиты: ${msg}.${hint}`);
                      return;
                    }
                    setClient((c) => ({ ...c, requisites: reqDraft }));
                    setReqModalOpen(false);
                  } catch {
                    alert("Не удалось сохранить реквизиты");
                  } finally {
                    setReqSaving(false);
                  }
                }}
                style={{
                  height: 38,
                  padding: "0 14px",
                  borderRadius: 10,
                  border: "none",
                  background: reqSaving ? BTN_IDLE : BTN_ACTIVE,
                  color: "#fff",
                  fontWeight: 900,
                  fontSize: 13,
                  cursor: reqSaving ? "default" : "pointer",
                }}
              >
                {reqSaving ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CommFeedIconBtn({
  title,
  disabled,
  onClick,
  icon,
  iconHover,
}: {
  title: string;
  disabled?: boolean;
  onClick: () => void;
  icon: string;
  iconHover: string;
}) {
  const [h, setH] = useState(false);
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      onClick={onClick}
      style={{
        width: 32,
        height: 32,
        padding: 0,
        border: "none",
        background: "transparent",
        cursor: disabled ? "default" : "pointer",
        display: "grid",
        placeItems: "center",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={h ? iconHover : icon} alt="" width={18} height={18} />
    </button>
  );
}

function ResetStatusPill({ onClick }: { onClick: () => void }) {
  const [h, setH] = useState(false);
  return (
    <button
      type="button"
      title="Сбросить"
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      onClick={onClick}
      style={{
        width: 36,
        height: 36,
        borderRadius: 8,
        border: "none",
        background: "transparent",
        display: "grid",
        placeItems: "center",
        cursor: "pointer",
        padding: 0,
        flexShrink: 0,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={h ? "/src/icons/close-nav.svg" : "/src/icons/close.svg"} alt="" width={18} height={18} />
    </button>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const [h, setH] = useState(false);
  return (
    <button
      type="button"
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      onClick={onClick}
      style={{
        height: 36,
        padding: "0 12px",
        borderRadius: 8,
        border: `1px solid ${active ? "#999999" : h ? "#5A86EE" : "#ededed"}`,
        background: active ? "#f3f6ff" : "#fff",
        color: "#111",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        fontSize: 13,
        transition: "border-color 120ms ease",
      }}
    >
      {children}
    </button>
  );
}
