import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcrypt";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

const PatchSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().default(""),
  role: z.enum(["ADMIN", "MANAGER"]),
  password: z.string().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;

  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const data: any = {
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    role: parsed.data.role === "ADMIN" ? UserRole.ADMIN : UserRole.MANAGER,
  };
  if (parsed.data.password && parsed.data.password.length >= 6) {
    data.passwordHash = await bcrypt.hash(parsed.data.password, 10);
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, username: true, firstName: true, lastName: true, role: true },
  });

  return NextResponse.json({ user: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;

  const user = await prisma.user.findUnique({ where: { id }, select: { username: true } });
  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (user.username === "timur")
    return NextResponse.json({ error: "protected" }, { status: 400 });

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

