"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const ICON = {
  voronka: "/src/icons/voronka.svg",
  voronkaNav: "/src/icons/voronka-nav.svg",
  users: "/src/icons/users.svg",
  usersNav: "/src/icons/users-nav.svg",
  septik: "/src/icons/septik.svg",
  septikNav: "/src/icons/septik-nav.svg",
  clients: "/src/icons/clients.svg",
  clientsNav: "/src/icons/clients-nav.svg",
  exit: "/src/icons/exit.svg",
  exitNav: "/src/icons/exit-nav.svg",
  logo: "/src/icons/logo.png",
} as const;

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
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            border: "none",
            background: "transparent",
            textDecoration: "none",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ICON.logo} alt="МОССЕПТИК" style={{ height: 28, width: "auto", display: "block" }} />
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          {role === "ADMIN" ? (
            <>
              <HoverIconTextLink
                href="/admin/funnels"
                title="Настройка воронок"
                iconDefault={ICON.voronka}
                iconHover={ICON.voronkaNav}
                label="Настройка воронок"
              />
              <HoverIconTextLink
                href="/admin/users"
                title="Пользователи"
                iconDefault={ICON.users}
                iconHover={ICON.usersNav}
                label="Пользователи"
              />
              <HoverIconTextLink
                href="/admin/septics"
                title="Септики"
                iconDefault={ICON.septik}
                iconHover={ICON.septikNav}
                label="Септики"
              />
            </>
          ) : null}
          <HoverIconTextLink
            href="/clients"
            title="Клиенты"
            iconDefault={ICON.clients}
            iconHover={ICON.clientsNav}
            label="Клиенты"
          />
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
            border: "none",
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
        <ExitButton />
      </div>
    </header>
  );
}

function HoverIconTextLink({
  href,
  title,
  iconDefault,
  iconHover,
  label,
}: {
  href: string;
  title?: string;
  iconDefault: string;
  iconHover: string;
  label: string;
}) {
  const [hover, setHover] = useState(false);
  return (
    <Link
      href={href}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        textDecoration: "none",
        border: "none",
        background: "transparent",
        padding: 0,
        cursor: "pointer",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={hover ? iconHover : iconDefault} alt="" width={20} height={20} style={{ display: "block" }} />
      <span
        style={{
          fontSize: 15,
          color: hover ? "#5A86EE" : "#666666",
          transition: "color 120ms ease",
        }}
      >
        {label}
      </span>
    </Link>
  );
}

function ExitButton() {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      title="Выйти"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 30,
        height: 30,
        borderRadius: 10,
        display: "grid",
        placeItems: "center",
        background: "transparent",
        border: "none",
        color: "#fff",
        cursor: "pointer",
        padding: 0,
      }}
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
        window.location.href = "/login";
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={hover ? ICON.exitNav : ICON.exit} alt="" width={20} height={20} style={{ display: "block" }} />
    </button>
  );
}
