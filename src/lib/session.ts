import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "@prisma/client";

export const SESSION_COOKIE = "ms_session";

export type SessionUser = {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role: UserRole;
};

type SessionClaims = {
  sub: string;
  username: string;
  firstName: string;
  lastName: string;
  role: UserRole;
};

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is missing");
  return new TextEncoder().encode(secret);
}

export async function signSession(user: SessionUser) {
  return new SignJWT({
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  } satisfies Omit<SessionClaims, "sub">)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey());
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const sub = typeof payload.sub === "string" ? payload.sub : null;
    const username = typeof payload.username === "string" ? payload.username : null;
    const firstName = typeof payload.firstName === "string" ? payload.firstName : "";
    const lastName = typeof payload.lastName === "string" ? payload.lastName : "";
    const role = payload.role === "ADMIN" || payload.role === "MANAGER" ? payload.role : null;
    if (!sub || !username || !role) return null;
    return { id: sub, username, firstName, lastName, role };
  } catch {
    return null;
  }
}

