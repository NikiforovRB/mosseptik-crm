import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

export async function getSessionUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return await verifySession(token);
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) return { ok: false as const };
  return { ok: true as const, user };
}

export async function requireAdmin() {
  const res = await requireUser();
  if (!res.ok) return res;
  if (res.user.role !== "ADMIN") return { ok: false as const };
  return res;
}

