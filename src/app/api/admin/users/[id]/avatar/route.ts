import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/serverAuth";

const BodySchema = z.object({
  avatarOriginalKey: z.string().min(1),
  avatarWebpKey: z.string().min(1),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const updated = await prisma.user.update({
    where: { id },
    data: {
      avatarOriginalKey: parsed.data.avatarOriginalKey,
      avatarWebpKey: parsed.data.avatarWebpKey,
    },
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
      role: true,
      avatarOriginalKey: true,
      avatarWebpKey: true,
    },
  });

  return NextResponse.json({ user: updated });
}

