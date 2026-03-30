import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/serverAuth";
import LoginForm from "./ui/LoginForm";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/");

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#fafafa",
        color: "#111",
      }}
    >
      <div style={{ width: "100%", maxWidth: 360 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
          МОССЕПТИК CRM
        </h1>
        <p style={{ marginTop: 8, marginBottom: 24, color: "#666" }}>
          Войдите, чтобы продолжить
        </p>
        <LoginForm />
      </div>
    </div>
  );
}

