"use client";

import { useCallback, useEffect, useState } from "react";

async function getSignedUrl(key: string) {
  const res = await fetch("/api/files/url", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ key }),
  });
  if (!res.ok) throw new Error("url failed");
  const json = await res.json();
  return String(json.url);
}

export default function ImageLightbox({
  open,
  onClose,
  originalKeys,
  startIndex,
}: {
  open: boolean;
  onClose: () => void;
  originalKeys: string[];
  startIndex: number;
}) {
  const [idx, setIdx] = useState(startIndex);
  const [urls, setUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const keysSig = originalKeys.join("\n");

  useEffect(() => {
    if (!open || originalKeys.length === 0) return;
    setIdx(Math.min(Math.max(0, startIndex), originalKeys.length - 1));
    let cancelled = false;
    setLoading(true);
    Promise.all(originalKeys.map((k) => getSignedUrl(k)))
      .then((u) => {
        if (!cancelled) setUrls(u);
      })
      .catch(() => {
        if (!cancelled) setUrls([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, startIndex, keysSig]);

  const go = useCallback(
    (delta: number) => {
      setIdx((i) => {
        const n = originalKeys.length;
        if (n === 0) return 0;
        return (i + delta + n) % n;
      });
    },
    [originalKeys.length]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, go]);

  if (!open || originalKeys.length === 0) return null;

  const url = urls[idx];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Просмотр фото"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.92)",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <button
        type="button"
        aria-label="Закрыть"
        onClick={onClose}
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          width: 44,
          height: 44,
          borderRadius: 12,
          border: "none",
          background: "rgba(255,255,255,0.15)",
          color: "#fff",
          fontSize: 22,
          cursor: "pointer",
          lineHeight: 1,
        }}
      >
        ×
      </button>

      {originalKeys.length > 1 ? (
        <button
          type="button"
          aria-label="Предыдущее"
          onClick={() => go(-1)}
          style={{
            position: "absolute",
            left: 16,
            top: "50%",
            transform: "translateY(-50%)",
            width: 48,
            height: 48,
            borderRadius: 12,
            border: "none",
            background: "rgba(255,255,255,0.15)",
            color: "#fff",
            fontSize: 28,
            cursor: "pointer",
          }}
        >
          ‹
        </button>
      ) : null}
      {originalKeys.length > 1 ? (
        <button
          type="button"
          aria-label="Следующее"
          onClick={() => go(1)}
          style={{
            position: "absolute",
            right: 16,
            top: "50%",
            transform: "translateY(-50%)",
            width: 48,
            height: 48,
            borderRadius: 12,
            border: "none",
            background: "rgba(255,255,255,0.15)",
            color: "#fff",
            fontSize: 28,
            cursor: "pointer",
          }}
        >
          ›
        </button>
      ) : null}

      <div
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          display: "grid",
          placeItems: "center",
        }}
      >
        {loading || !url ? (
          <div style={{ color: "#fff", fontSize: 14 }}>Загрузка…</div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            style={{
              maxWidth: "min(96vw, 1600px)",
              maxHeight: "88vh",
              objectFit: "contain",
              display: "block",
            }}
          />
        )}
      </div>

      {originalKeys.length > 1 ? (
        <div style={{ position: "absolute", bottom: 20, color: "#fff", fontSize: 13 }}>
          {idx + 1} / {originalKeys.length}
        </div>
      ) : null}
    </div>
  );
}
