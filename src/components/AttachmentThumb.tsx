"use client";

import { useEffect, useState } from "react";

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

export default function AttachmentThumb({
  webpKey,
  originalKey,
  onView,
  onDelete,
}: {
  webpKey: string;
  originalKey: string;
  /** If set, called instead of opening a new tab (e.g. fullscreen lightbox). */
  onView?: () => void;
  /** If set, shows delete control (e.g. while editing a communication). */
  onDelete?: () => void;
}) {
  const [webpUrl, setWebpUrl] = useState<string | null>(null);
  const [origUrl, setOrigUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSignedUrl(webpKey)
      .then((u) => {
        if (!cancelled) setWebpUrl(u);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [webpKey]);

  useEffect(() => {
    if (onView) return;
    let cancelled = false;
    getSignedUrl(originalKey)
      .then((u) => {
        if (!cancelled) setOrigUrl(u);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [originalKey, onView]);

  const canClick = Boolean(onView || origUrl);

  return (
    <div
      style={{
        position: "relative",
        border: "1px solid #ededed",
        borderRadius: 12,
        overflow: "hidden",
        background: "#fff",
        height: 110,
      }}
    >
      <button
        type="button"
        onClick={() => {
          if (onView) onView();
          else if (origUrl) window.open(origUrl, "_blank", "noopener,noreferrer");
        }}
        disabled={!canClick}
        style={{
          padding: 0,
          border: "none",
          background: "transparent",
          cursor: canClick ? "pointer" : "default",
          width: "100%",
          height: "100%",
          display: "block",
        }}
        title={onView ? "Открыть" : "Открыть оригинал"}
      >
        {webpUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={webpUrl}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "#f2f2f2" }} />
        )}
      </button>

      {onDelete ? (
        <button
          type="button"
          title="Удалить фото"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            width: 28,
            height: 28,
            borderRadius: "50%",
            border: "none",
            background: "#fff",
            boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
            padding: 0,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/src/icons/delete-black.svg" alt="" width={16} height={16} />
        </button>
      ) : null}
    </div>
  );
}
