import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/serverAuth";
import { prisma } from "@/lib/prisma";

const CreateSchema = z.object({
  name: z.string().min(1).max(80),
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = CreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const created = await prisma.funnel.create({
    data: {
      name: parsed.data.name.trim(),
      stages: {
        create: [{ name: "Новая", order: 1, headerColor: "#ccd0e1" }],
      },
    },
    include: { stages: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ funnel: created });
}

