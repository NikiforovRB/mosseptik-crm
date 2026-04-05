import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/serverAuth";

const BodySchema = z.object({
  clientId: z.string().min(1),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  middleName: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  septicModelId: z.string().nullable().optional(),
  shortComment: z.string().nullable().optional(),
  requisites: z.string().max(20000).optional(),
  assignedManagerId: z.string().nullable().optional(),
  qualified: z.boolean().nullable().optional(),
  moneyProgress: z
    .enum(["ASSIGNED", "CONFIRMED", "DONE_WITH_MONEY", "DONE_WITHOUT_MONEY"])
    .nullable()
    .optional(),
  gsoType: z.enum(["GSO1", "GSO2"]).nullable().optional(),
  funnelStageId: z.string().min(1).optional(),
});

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const {
    clientId,
    firstName,
    lastName,
    middleName,
    phone,
    septicModelId,
    shortComment,
    requisites,
    assignedManagerId,
    qualified,
    moneyProgress,
    gsoType,
    funnelStageId,
  } = parsed.data;

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, assignedManagerId: true, isDealDeleted: true, funnelStageId: true },
  });
  if (!client) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (client.isDealDeleted) {
    return NextResponse.json({ error: "deal_deleted" }, { status: 400 });
  }

  if (auth.user.role !== "ADMIN" && client.assignedManagerId !== auth.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const data: any = {};
  if (firstName !== undefined) data.firstName = firstName;
  if (lastName !== undefined) data.lastName = lastName;
  if (middleName !== undefined) data.middleName = middleName;
  if (phone !== undefined) data.phone = phone;
  if (septicModelId !== undefined) data.septicModelId = septicModelId;
  if (shortComment !== undefined) data.shortComment = shortComment;
  if (requisites !== undefined) data.requisites = requisites;
  if (assignedManagerId !== undefined) {
    if (auth.user.role !== "ADMIN") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    data.assignedManagerId = assignedManagerId;
  }
  if (qualified !== undefined) data.qualified = qualified;
  if (moneyProgress !== undefined) data.moneyProgress = moneyProgress;
  if (gsoType !== undefined) data.gsoType = gsoType;

  if (funnelStageId !== undefined && funnelStageId !== client.funnelStageId) {
    const stage = await prisma.funnelStage.findUnique({
      where: { id: funnelStageId },
      select: { id: true },
    });
    if (!stage) return NextResponse.json({ error: "bad_stage" }, { status: 400 });
    const last = await prisma.client.findFirst({
      where: { funnelStageId },
      orderBy: { orderInStage: "desc" },
      select: { orderInStage: true },
    });
    const nextOrder = (last?.orderInStage ?? -1) + 1;
    data.funnelStageId = funnelStageId;
    data.orderInStage = nextOrder;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "no_fields_to_update" }, { status: 400 });
  }

  try {
    await prisma.client.update({ where: { id: clientId }, data });
  } catch (e) {
    console.error("[api/clients/update]", e);
    return NextResponse.json(
      {
        error: "update_failed",
        message: e instanceof Error ? e.message : "unknown",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

