"use client";

import { useState } from "react";

export default function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ username, password }),
          });
          if (!res.ok) {
            const json = await res.json().catch(() => null);
            if (res.status === 503 && json?.error === "db_unavailable") {
              setError("Нет доступа к базе данных (проверьте DATABASE_URL/доступ).");
            } else {
              setError("Неверный логин или пароль");
            }
            setLoading(false);
            return;
          }
          window.location.href = "/";
        } catch {
          setError("Не удалось войти");
          setLoading(false);
        }
      }}
      style={{ display: "grid", gap: 12 }}
    >
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 12, color: "#555" }}>Логин</span>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          style={{
            height: 40,
            padding: "0 12px",
            borderRadius: 10,
            border: "1px solid #e6e6e6",
            outline: "none",
            background: "#fff",
          }}
        />
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 12, color: "#555" }}>Пароль</span>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          autoComplete="current-password"
          style={{
            height: 40,
            padding: "0 12px",
            borderRadius: 10,
            border: "1px solid #e6e6e6",
            outline: "none",
            background: "#fff",
          }}
        />
      </label>
      {error ? (
        <div style={{ color: "#b00020", fontSize: 13 }}>{error}</div>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        style={{
          height: 40,
          borderRadius: 10,
          border: "none",
          background: "#111",
          color: "#fff",
          cursor: "pointer",
          fontWeight: 600,
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "Входим..." : "Войти"}
      </button>
    </form>
  );
}

