import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcrypt";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

const CreateSchema = z.object({
  username: z.string().min(2),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().default(""),
  role: z.enum(["ADMIN", "MANAGER"]).default("MANAGER"),
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = CreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
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
}

