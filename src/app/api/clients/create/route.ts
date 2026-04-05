import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/serverAuth";

const BodySchema = z.object({
  section: z.enum(["montazh", "service"]).default("montazh"),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  middleName: z.string().optional().nullable(),
  phone: z.string().optional(),
  assignedManagerId: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const funnelName = parsed.data.section === "service" ? "Сервис" : "Монтаж";

  const funnel = await prisma.funnel.findFirst({
    where: { name: { contains: funnelName, mode: "insensitive" } },
    include: { stages: { orderBy: { order: "asc" }, take: 1 } },
  });
  if (!funnel?.stages?.[0]) {
    return NextResponse.json({ error: "no_funnel" }, { status: 400 });
  }

  const firstStage = funnel.stages[0];

  const last = await prisma.client.findFirst({
    where: { funnelStageId: firstStage.id },
    orderBy: { orderInStage: "desc" },
    select: { orderInStage: true },
  });
  const nextOrder = (last?.orderInStage ?? -1) + 1;

  const middle = (parsed.data.middleName ?? "").trim();
  const created = await prisma.client.create({
    data: {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      middleName: middle ? middle : null,
      phone: parsed.data.phone ? parsed.data.phone : null,
      shortComment: "",
      funnelStageId: firstStage.id,
      orderInStage: nextOrder,
      assignedManagerId:
        auth.user.role === "ADMIN"
          ? parsed.data.assignedManagerId ?? null
          : auth.user.id,
    },
    select: { id: true },
  });

  return NextResponse.json({ clientId: created.id });
}

