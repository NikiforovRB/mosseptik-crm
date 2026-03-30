import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
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
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  return NextResponse.json({ user });
}

