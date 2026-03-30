import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/serverAuth";

const BodySchema = z.object({
  clientId: z.string().min(1),
  phone: z.string().nullable().optional(),
  septicModelId: z.string().nullable().optional(),
  shortComment: z.string().nullable().optional(),
  qualified: z.boolean().optional(),
  moneyProgress: z
    .enum(["ASSIGNED", "CONFIRMED", "DONE_WITH_MONEY", "DONE_WITHOUT_MONEY"])
    .optional(),
  gsoType: z.enum(["GSO1", "GSO2"]).optional(),
});

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const {
    clientId,
    phone,
    septicModelId,
    shortComment,
    qualified,
    moneyProgress,
    gsoType,
  } = parsed.data;

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, assignedManagerId: true },
  });
  if (!client) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (auth.user.role !== "ADMIN" && client.assignedManagerId !== auth.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const data: any = {};
  if (phone !== undefined) data.phone = phone;
  if (septicModelId !== undefined) data.septicModelId = septicModelId;
  if (shortComment !== undefined) data.shortComment = shortComment;
  if (qualified !== undefined) data.qualified = qualified;
  if (moneyProgress !== undefined) data.moneyProgress = moneyProgress;
  if (gsoType !== undefined) data.gsoType = gsoType;

  await prisma.client.update({ where: { id: clientId }, data });

  return NextResponse.json({ ok: true });
}

