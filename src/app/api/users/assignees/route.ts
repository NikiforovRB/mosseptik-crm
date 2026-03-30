import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (auth.user.role !== "ADMIN") {
    return NextResponse.json({
      users: [
        {
          id: auth.user.id,
          firstName: auth.user.firstName,
          lastName: auth.user.lastName,
          role: auth.user.role,
        },
      ],
    });
  }

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true, role: true },
  });

  return NextResponse.json({ users });
}

