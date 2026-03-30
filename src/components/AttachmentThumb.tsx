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
}: {
  webpKey: string;
  originalKey: string;
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
    getSignedUrl(originalKey)
      .then((u) => {
        if (!cancelled) setOrigUrl(u);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [webpKey, originalKey]);

  return (
    <button
      type="button"
      onClick={() => {
        if (origUrl) window.open(origUrl, "_blank", "noopener,noreferrer");
      }}
      style={{
        padding: 0,
        border: "1px solid #ededed",
        borderRadius: 12,
        overflow: "hidden",
        background: "#fff",
        cursor: origUrl ? "pointer" : "default",
        height: 110,
      }}
      title="Открыть оригинал"
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
  );
}

