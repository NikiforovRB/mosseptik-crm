import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcrypt";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { Prisma, UserRole } from "@prisma/client";

const CreateSchema = z.object({
  username: z.string().trim().min(2, "Логин — не менее 2 символов"),
  password: z.string().min(6, "Пароль — не менее 6 символов"),
  firstName: z.string().trim().min(1, "Укажите имя"),
  lastName: z.string().trim().default(""),
  role: z.enum(["ADMIN", "MANAGER"]).default("MANAGER"),
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = CreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Проверьте введённые данные";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  try {
    const created = await prisma.user.create({
      data: {
        username: parsed.data.username,
        passwordHash,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        role: parsed.data.role === "ADMIN" ? UserRole.ADMIN : UserRole.MANAGER,
      },
      select: { id: true, username: true, firstName: true, lastName: true, role: true },
    });
    return NextResponse.json({ user: created });
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Пользователь с таким логином уже существует" }, { status: 409 });
    }
    throw e;
  }
}

