import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, signSession } from "@/lib/session";

const BodySchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const username = parsed.data.username.trim();
  const password = parsed.data.password;

  let user: Awaited<ReturnType<typeof prisma.user.findUnique>> = null;
  try {
    user = await prisma.user.findUnique({ where: { username } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "db_error";
    return NextResponse.json(
      { error: "db_unavailable", message },
      { status: 503 }
    );
  }
  if (!user) return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });

  const token = await signSession({
    id: user.id,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  });

  const res = NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
  });
  res.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

