import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function asString(x: unknown) {
  return typeof x === "string" ? x : "";
}

function extractPrismaCode(err: unknown) {
  if (!err || typeof err !== "object") return null;
  const anyErr = err as any;
  const code = asString(anyErr.code) || asString(anyErr.errorCode);
  return code || null;
}

export async function GET() {
  try {
    // Lightweight connection check
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      message: "DB connection ok",
    });
  } catch (err) {
    const code = extractPrismaCode(err);
    const message = err instanceof Error ? err.message : "Unknown DB error";

    let hint: string | undefined;
    if (code === "P1000" || message.toLowerCase().includes("authentication failed")) {
      hint =
        "DB auth failed. Проверьте POSTGRESQL_USER/POSTGRESQL_PASSWORD, DATABASE_URL и доступ по IP/SSL (sslmode=require).";
    } else if (code === "P1001" || message.toLowerCase().includes("can't reach database server")) {
      hint =
        "DB unreachable. Проверьте POSTGRESQL_HOST/PORT, сетевой доступ и firewall.";
    }

    return NextResponse.json(
      {
        ok: false,
        error: code ?? "DB_ERROR",
        message,
        hint,
      },
      { status: 503 }
    );
  }
}

