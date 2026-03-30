import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const CreateSchema = z.object({ name: z.string().min(1) });

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = CreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const septic = await prisma.septicModel.create({
    data: { name: parsed.data.name },
    select: { id: true, name: true },
  });

  return NextResponse.json({ septic });
}

