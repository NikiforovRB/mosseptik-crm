"use client";

import { useEffect, useMemo, useState } from "react";
import { fileToWebpBlob } from "@/lib/image";
import { presignUpload, putObject } from "@/lib/upload";

type PriceHistoryRow = {
  id: string;
  kind: "PURCHASE" | "SALE";
  price: number;
  createdAt: string;
};

type Row = {
  id: string;
  name: string;
  purchasePrice: number | null;
  salePrice: number | null;
  imageOriginalKey: string | null;
  imageWebpKey: string | null;
  priceHistoryItems: PriceHistoryRow[];
};

function fmtPrice(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "";
  const base = String(Math.max(0, Math.round(v)));
  return `${base.replace(/\B(?=(\d{3})+(?!\d))/g, " ")} ₽`;
}

function parsePrice(value: string): number | null {
  const s = value.replace(/[^\d]/g, "").trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return NaN;
  return Math.round(n);
}

function formatPriceInput(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return "";
  return `${digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ")} ₽`;
}

function fmtHistoryDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SepticsAdmin({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initial);
  const [addOpen, setAddOpen] = useState(false);
  const [addBtnHover, setAddBtnHover] = useState(false);
  const [name, setName] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const addMargin = useMemo(() => {
    const p = parsePrice(purchasePrice);
    const s = parsePrice(salePrice);
    if (p === null || s === null || Number.isNaN(p) || Number.isNaN(s)) return null;
    return s - p;
  }, [purchasePrice, salePrice]);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <h1 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>Септики</h1>
        <button
          type="button"
          onMouseEnter={() => setAddBtnHover(true)}
          onMouseLeave={() => setAddBtnHover(false)}
          style={{
            ...secondaryBtn,
            color: "#0f68e4",
            borderColor: addBtnHover ? "#0f68e4" : "#ededed",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
          onClick={() => setAddOpen(true)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          Добавить новый септик
        </button>
      </div>

      <div style={{ background: "#fff" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: GRID_TEMPLATE_COLUMNS,
            gap: 10,
            padding: "0 0 8px 0",
            color: "#666",
            fontSize: 12,
          }}
        >
          <div />
          <div style={headerCellStyle}>Модель септика</div>
          <div style={headerCellStyle}>Стоимость закупки</div>
          <div style={headerCellStyle}>Стоимость продажи</div>
          <div style={headerCellStyle}>Маржинальность</div>
          <div />
          <div />
        </div>
        <div style={{ display: "grid" }}>
          {rows.map((r, idx) => (
            <SepticRow
              key={r.id}
              row={r}
              isFirst={idx === 0}
              onChange={(next) => setRows((all) => all.map((x) => (x.id === next.id ? next : x)))}
              onDelete={() => setRows((all) => all.filter((x) => x.id !== r.id))}
            />
          ))}
        </div>
      </div>

      {addOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setAddOpen(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "grid",
            placeItems: "center",
            padding: 20,
            zIndex: 60,
          }}
        >
          <div
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 560,
              background: "#fff",
              borderRadius: 14,
              border: "1px solid #eee",
              padding: 16,
              display: "grid",
              gap: 10,
            }}
          >
            <div style={{ fontSize: 16, color: "#111" }}>Новый септик</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 180px 180px 180px", gap: 10 }}>
              <input placeholder="Название модели" value={name} onChange={(e) => setName(e.target.value)} style={input} />
              <input
                placeholder="Закупка, ₽"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(formatPriceInput(e.target.value))}
                style={input}
              />
              <input
                placeholder="Продажа, ₽"
                value={salePrice}
                onChange={(e) => setSalePrice(formatPriceInput(e.target.value))}
                style={input}
              />
              <input value={addMargin === null ? "" : fmtPrice(addMargin)} readOnly style={{ ...input, color: "#444" }} placeholder="Маржинальность" />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" style={ghostBtn} onClick={() => setAddOpen(false)}>
                Отмена
              </button>
              <button
                type="button"
                style={primaryBtn}
                onClick={async () => {
                  const p = parsePrice(purchasePrice);
                  const s = parsePrice(salePrice);
                  if (Number.isNaN(p) || Number.isNaN(s)) return alert("Цена должна быть положительным числом");
                  const res = await fetch("/api/admin/septics", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ name, purchasePrice: p, salePrice: s }),
                  });
                  if (!res.ok) return alert("Не удалось добавить");
                  const json = await res.json();
                  setRows((r) => [...r, json.septic]);
                  setName("");
                  setPurchasePrice("");
                  setSalePrice("");
                  setAddOpen(false);
                }}
              >
                Добавить
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SepticRow({
  row,
  isFirst,
  onChange,
  onDelete,
}: {
  row: Row;
  isFirst: boolean;
  onChange: (r: Row) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(row.name);
  const [purchasePrice, setPurchasePrice] = useState(fmtPrice(row.purchasePrice));
  const [salePrice, setSalePrice] = useState(fmtPrice(row.salePrice));
  const [showPurchaseHistory, setShowPurchaseHistory] = useState(false);
  const [showSaleHistory, setShowSaleHistory] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [saveHover, setSaveHover] = useState(false);
  const [photoHover, setPhotoHover] = useState(false);

  useEffect(() => {
    setName(row.name);
    setPurchasePrice(fmtPrice(row.purchasePrice));
    setSalePrice(fmtPrice(row.salePrice));
  }, [row.id, row.name, row.purchasePrice, row.salePrice]);

  useEffect(() => {
    if (!row.imageWebpKey) {
      setImageUrl(null);
      return;
    }
    let cancelled = false;
    fetch("/api/files/url", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: row.imageWebpKey }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!cancelled && j?.url) setImageUrl(String(j.url));
      })
      .catch(() => {
        if (!cancelled) setImageUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [row.imageWebpKey]);

  const purchaseHistory = useMemo(
    () => row.priceHistoryItems.filter((x) => x.kind === "PURCHASE"),
    [row.priceHistoryItems]
  );
  const saleHistory = useMemo(
    () => row.priceHistoryItems.filter((x) => x.kind === "SALE"),
    [row.priceHistoryItems]
  );
  const margin = useMemo(() => {
    const p = parsePrice(purchasePrice);
    const s = parsePrice(salePrice);
    if (p === null || s === null || Number.isNaN(p) || Number.isNaN(s)) return null;
    return s - p;
  }, [purchasePrice, salePrice]);
  const isDirty =
    name.trim() !== row.name.trim() ||
    parsePrice(purchasePrice) !== row.purchasePrice ||
    parsePrice(salePrice) !== row.salePrice;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: GRID_TEMPLATE_COLUMNS,
        gap: 10,
        padding: "12px 0",
        borderTop: isFirst ? "none" : "1px solid #dddcdb",
        alignItems: "start",
      }}
    >
      <div style={{ display: "grid", justifyItems: "start" }}>
        <label
          style={{ cursor: uploading ? "default" : "pointer", position: "relative", display: "block" }}
          onMouseEnter={() => setPhotoHover(true)}
          onMouseLeave={() => setPhotoHover(false)}
        >
          <div style={{ width: 64, height: 64, borderRadius: 12, overflow: "hidden", background: "#f2f2f2", border: "1px solid #e9e9e9" }}>
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center" }}>
                <span style={{ fontSize: 11, color: "#888" }}>Нет фото</span>
              </div>
            )}
            <div style={{ ...photoOverlayStyle, opacity: photoHover ? 1 : 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M4 20h4l10.8-10.8a1.4 1.4 0 0 0 0-2L16.8 5a1.4 1.4 0 0 0-2 0L4 15.8V20Z" stroke="#fff" strokeWidth="1.8" />
                <path d="m13.5 6.5 4 4" stroke="#fff" strokeWidth="1.8" />
              </svg>
            </div>
          </div>
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
                  purpose: "septicImage",
                  variant: "original",
                  contentType: file.type || "application/octet-stream",
                  ext,
                });
                const webpBlob = await fileToWebpBlob(file, { maxSize: 720, quality: 0.86 });
                const webpPresign = await presignUpload({
                  purpose: "septicImage",
                  variant: "webp",
                  contentType: "image/webp",
                  ext: "webp",
                });
                await putObject(originalPresign.uploadUrl, file);
                await putObject(webpPresign.uploadUrl, webpBlob);
                const res = await fetch(`/api/admin/septics/${row.id}`, {
                  method: "PATCH",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({
                    imageOriginalKey: originalPresign.key,
                    imageWebpKey: webpPresign.key,
                  }),
                });
                if (!res.ok) throw new Error("upload_failed");
                const json = await res.json();
                onChange(json.septic);
              } catch {
                alert("Не удалось загрузить изображение");
              } finally {
                setUploading(false);
              }
            }}
          />
        </label>
      </div>

      <input value={name} onChange={(e) => setName(e.target.value)} style={input} />

      <div style={{ display: "grid", gap: 6 }}>
        <input
          value={purchasePrice}
          onChange={(e) => setPurchasePrice(formatPriceInput(e.target.value))}
          placeholder="Закупка, ₽"
          style={input}
        />
        <button type="button" style={ghostBtn} onClick={() => setShowPurchaseHistory((v) => !v)}>
          {showPurchaseHistory ? "Скрыть историю" : "История закупки"}
        </button>
        {showPurchaseHistory ? (
          <HistoryBox
            rows={purchaseHistory}
            onEdit={async (h) => {
              const nextRaw = prompt("Новая цена:", String(h.price));
              if (nextRaw === null) return;
              const p = parsePrice(nextRaw);
              if (p === null || Number.isNaN(p)) return alert("Цена должна быть положительным числом");
              const res = await fetch(`/api/admin/septics/history/${h.id}`, {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ price: p }),
              });
              if (!res.ok) return alert("Не удалось изменить запись истории");
              const json = await res.json();
              const nextHistory = row.priceHistoryItems.map((x) => (x.id === h.id ? json.item : x));
              onChange({ ...row, priceHistoryItems: nextHistory });
            }}
            onDelete={async (h) => {
              if (!confirm("Удалить запись истории?")) return;
              const res = await fetch(`/api/admin/septics/history/${h.id}`, { method: "DELETE" });
              if (!res.ok) return alert("Не удалось удалить запись истории");
              const nextHistory = row.priceHistoryItems.filter((x) => x.id !== h.id);
              onChange({ ...row, priceHistoryItems: nextHistory });
            }}
          />
        ) : null}
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <input
          value={salePrice}
          onChange={(e) => setSalePrice(formatPriceInput(e.target.value))}
          placeholder="Продажа, ₽"
          style={input}
        />
        <button type="button" style={ghostBtn} onClick={() => setShowSaleHistory((v) => !v)}>
          {showSaleHistory ? "Скрыть историю" : "История продажи"}
        </button>
        {showSaleHistory ? (
          <HistoryBox
            rows={saleHistory}
            onEdit={async (h) => {
              const nextRaw = prompt("Новая цена:", String(h.price));
              if (nextRaw === null) return;
              const p = parsePrice(nextRaw);
              if (p === null || Number.isNaN(p)) return alert("Цена должна быть положительным числом");
              const res = await fetch(`/api/admin/septics/history/${h.id}`, {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ price: p }),
              });
              if (!res.ok) return alert("Не удалось изменить запись истории");
              const json = await res.json();
              const nextHistory = row.priceHistoryItems.map((x) => (x.id === h.id ? json.item : x));
              onChange({ ...row, priceHistoryItems: nextHistory });
            }}
            onDelete={async (h) => {
              if (!confirm("Удалить запись истории?")) return;
              const res = await fetch(`/api/admin/septics/history/${h.id}`, { method: "DELETE" });
              if (!res.ok) return alert("Не удалось удалить запись истории");
              const nextHistory = row.priceHistoryItems.filter((x) => x.id !== h.id);
              onChange({ ...row, priceHistoryItems: nextHistory });
            }}
          />
        ) : null}
      </div>

      <div style={{ display: "flex", alignItems: "center", height: 38, color: "#333", fontSize: 13 }}>
        {margin === null ? "—" : fmtPrice(margin)}
      </div>

      <button
        type="button"
        disabled={!isDirty}
        onMouseEnter={() => setSaveHover(true)}
        onMouseLeave={() => setSaveHover(false)}
        style={{
          ...secondaryBtn,
          color: isDirty ? "#0f68e4" : "#999",
          borderColor: isDirty && saveHover ? "#0f68e4" : "#ededed",
          cursor: isDirty ? "pointer" : "default",
        }}
        onClick={async () => {
          if (!isDirty) return;
          const p = parsePrice(purchasePrice);
          const s = parsePrice(salePrice);
          if (Number.isNaN(p) || Number.isNaN(s)) return alert("Цена должна быть положительным числом");
          const res = await fetch(`/api/admin/septics/${row.id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ name, purchasePrice: p, salePrice: s }),
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

function HistoryBox({
  rows,
  onEdit,
  onDelete,
}: {
  rows: PriceHistoryRow[];
  onEdit: (row: PriceHistoryRow) => void;
  onDelete: (row: PriceHistoryRow) => void;
}) {
  return (
    <div
      style={{
        border: "1px solid #ededed",
        borderRadius: 8,
        padding: 8,
        maxHeight: 140,
        overflowY: "auto",
        background: "#fcfcfc",
        display: "grid",
        gap: 4,
      }}
    >
      {rows.length === 0 ? <div style={{ fontSize: 12, color: "#888" }}>Изменений пока нет</div> : null}
      {rows.map((h) => (
        <div key={h.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12, color: "#444", alignItems: "center" }}>
          <span>{h.price.toLocaleString("ru-RU")} ₽</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#777" }}>{fmtHistoryDate(h.createdAt)}</span>
            <button type="button" style={iconBtn} onClick={() => onEdit(h)} title="Редактировать">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/src/icons/edit.svg" alt="" width={14} height={14} />
            </button>
            <button type="button" style={iconBtn} onClick={() => onDelete(h)} title="Удалить">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/src/icons/delete.svg" alt="" width={14} height={14} />
            </button>
          </div>
        </div>
      ))}
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

const ghostBtn: React.CSSProperties = {
  height: 28,
  borderRadius: 8,
  border: "1px solid #ededed",
  background: "#fff",
  color: "#555",
  cursor: "pointer",
  padding: "0 10px",
  fontSize: 12,
  justifySelf: "start",
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

const iconBtn: React.CSSProperties = {
  width: 20,
  height: 20,
  padding: 0,
  border: "none",
  background: "transparent",
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
};

const GRID_TEMPLATE_COLUMNS = "86px 200px 270px 270px 180px 110px 100px";

const headerCellStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  justifySelf: "stretch",
  textAlign: "left",
  paddingLeft: 10,
  whiteSpace: "nowrap",
};

const photoOverlayStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  borderRadius: 12,
  background: "rgba(0,0,0,0.35)",
  display: "grid",
  placeItems: "center",
  transition: "opacity 140ms ease",
};

