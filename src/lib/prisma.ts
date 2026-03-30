import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

function ensureDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (url && !url.includes("USER:PASSWORD@HOST")) return;

  const host = process.env.POSTGRESQL_HOST;
  const port = process.env.POSTGRESQL_PORT ?? "5432";
  const user = process.env.POSTGRESQL_USER;
  const password = process.env.POSTGRESQL_PASSWORD;
  const db = process.env.POSTGRESQL_DBNAME;
  const ssl = process.env.POSTGRESQL_SSL;

  if (!host || !user || !password || !db) return;

  const enc = encodeURIComponent;
  const sslmode =
    ssl && ["1", "true", "yes", "on"].includes(String(ssl).toLowerCase())
      ? "&sslmode=require"
      : "";
  process.env.DATABASE_URL = `postgresql://${enc(user)}:${enc(password)}@${host}:${port}/${db}?schema=public${sslmode}`;
}

ensureDatabaseUrl();

export const prisma =
  global.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") global.prisma = prisma;

