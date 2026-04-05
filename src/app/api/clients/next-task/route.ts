import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/serverAuth";

const CreateSchema = z.object({
  clientId: z.string().min(1),
  assigneeId: z.string().min(1).optional(),
  dueAt: z.string().datetime().nullable().optional(),
  dueHasTime: z.boolean().optional(),
});

const PatchSchema = z.object({
  clientId: z.string().min(1),
  assigneeId: z.string().min(1).optional(),
  dueAt: z.string().datetime().nullable().optional(),
  dueHasTime: z.boolean().optional(),
});

const DeleteSchema = z.object({
  clientId: z.string().min(1),
});

async function assertClient(clientId: string, userId: string, role: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, assignedManagerId: true, isDealDeleted: true },
  });
  if (!client) return { ok: false as const, status: 404 as const, error: "not_found" };
  if (client.isDealDeleted) return { ok: false as const, status: 400 as const, error: "deal_deleted" };
  if (role !== "ADMIN" && client.assignedManagerId !== userId) {
    return { ok: false as const, status: 403 as const, error: "forbidden" };
  }
  return { ok: true as const, client };
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = CreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const { clientId, assigneeId, dueAt, dueHasTime } = parsed.data;
  const gate = await assertClient(clientId, auth.user.id, auth.user.role);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const existing = await prisma.clientNextTask.findUnique({ where: { clientId } });
  if (existing) return NextResponse.json({ error: "task_exists" }, { status: 409 });

  const assignee = assigneeId ?? auth.user.id;
  const userOk = await prisma.user.findUnique({ where: { id: assignee }, select: { id: true } });
  if (!userOk) return NextResponse.json({ error: "bad_assignee" }, { status: 400 });

  const created = await prisma.clientNextTask.create({
    data: {
      clientId,
      assigneeId: assignee,
      dueAt: dueAt ? new Date(dueAt) : null,
      dueHasTime: dueHasTime ?? false,
    },
    include: {
      assignee: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  return NextResponse.json({ task: created });
}

export async function PATCH(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const { clientId, assigneeId, dueAt, dueHasTime } = parsed.data;
  const gate = await assertClient(clientId, auth.user.id, auth.user.role);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const task = await prisma.clientNextTask.findUnique({ where: { clientId } });
  if (!task) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (assigneeId !== undefined) {
    const u = await prisma.user.findUnique({ where: { id: assigneeId }, select: { id: true } });
    if (!u) return NextResponse.json({ error: "bad_assignee" }, { status: 400 });
    data.assigneeId = assigneeId;
  }
  if (dueAt !== undefined) data.dueAt = dueAt === null ? null : new Date(dueAt);
  if (dueHasTime !== undefined) data.dueHasTime = dueHasTime;

  const updated = await prisma.clientNextTask.update({
    where: { clientId },
    data,
    include: {
      assignee: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  return NextResponse.json({ task: updated });
}

export async function DELETE(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const parsed = DeleteSchema.safeParse({ clientId: searchParams.get("clientId") ?? "" });
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const { clientId } = parsed.data;
  const gate = await assertClient(clientId, auth.user.id, auth.user.role);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  await prisma.clientNextTask.deleteMany({ where: { clientId } });
  return NextResponse.json({ ok: true });
}
