-- Client.middleName + ClientNextTask (one active task per client)
-- Safe to run multiple times.

ALTER TABLE "Client"
ADD COLUMN IF NOT EXISTS "middleName" TEXT;

CREATE TABLE IF NOT EXISTS "ClientNextTask" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "dueAt" TIMESTAMP(3),
  "dueHasTime" BOOLEAN NOT NULL DEFAULT false,
  "assigneeId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ClientNextTask_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ClientNextTask_clientId_key" ON "ClientNextTask"("clientId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ClientNextTask_clientId_fkey'
  ) THEN
    ALTER TABLE "ClientNextTask"
    ADD CONSTRAINT "ClientNextTask_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ClientNextTask_assigneeId_fkey'
  ) THEN
    ALTER TABLE "ClientNextTask"
    ADD CONSTRAINT "ClientNextTask_assigneeId_fkey"
    FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ClientNextTask_assigneeId_idx" ON "ClientNextTask"("assigneeId");
