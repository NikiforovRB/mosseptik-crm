"use client";

import Link from "next/link";
import {
  Users,
  SlidersHorizontal,
  Truck,
  LogOut,
  Contact,
} from "lucide-react";
import { useEffect, useState } from "react";

export default function AppHeader() {
  const [me, setMe] = useState<{
    id: string;
    firstName: string;
    lastName: string;
    role: "ADMIN" | "MANAGER";
    avatarWebpKey?: string | null;
    avatarOriginalKey?: string | null;
  } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setMe(j?.user ?? null))
      .catch(() => setMe(null));
  }, []);

  useEffect(() => {
    const key = me?.avatarWebpKey;
    if (!key) {
      setAvatarUrl(null);
      return;
    }
    fetch("/api/files/url", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setAvatarUrl(j?.url ?? null))
      .catch(() => setAvatarUrl(null));
  }, [me?.avatarWebpKey]);

  const role = me?.role;
  const name = me ? `${me.firstName} ${me.lastName}`.trim() : "";

  return (
    <header
      style={{
        height: 64,
        background: "#000000",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Link
          href="/"
          style={{
            fontWeight: 800,
            letterSpacing: 0.5,
            fontSize: 16,
          }}
        >
          МОССЕПТИК
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {role === "ADMIN" ? (
            <>
              <Link href="/admin/funnels" title="Настройка воронок" style={iconLinkStyle}>
                <SlidersHorizontal size={18} />
              </Link>
              <Link href="/admin/users" title="Пользователи" style={iconLinkStyle}>
                <Users size={18} />
              </Link>
              <Link href="/admin/septics" title="Септики" style={iconLinkStyle}>
                <Truck size={18} />
              </Link>
            </>
          ) : null}
          <Link href="/clients" title="Клиенты" style={clientsLinkStyle}>
            <Contact size={16} />
            <span>Клиенты</span>
          </Link>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ textAlign: "right", lineHeight: 1.2 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{name}</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            {role === "ADMIN" ? "Администратор" : "Менеджер"}
          </div>
        </div>
        <div
          title="Профиль"
          style={{
            width: 34,
            height: 34,
            borderRadius: 999,
            background: "rgba(255,255,255,0.15)",
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : null}
        </div>
        <button
          type="button"
          title="Выйти"
          style={iconButtonStyle}
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
            window.location.href = "/login";
          }}
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}

const iconButtonStyle: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 10,
  display: "grid",
  placeItems: "center",
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.15)",
  color: "#fff",
  cursor: "pointer",
};

const iconLinkStyle: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 10,
  display: "grid",
  placeItems: "center",
  border: "1px solid rgba(255,255,255,0.15)",
};

const clientsLinkStyle: React.CSSProperties = {
  height: 34,
  borderRadius: 10,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  border: "1px solid rgba(255,255,255,0.15)",
  padding: "0 10px",
  color: "#fff",
  fontSize: 13,
};

