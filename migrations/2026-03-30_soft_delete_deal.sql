-- Keep contact but hide deleted deals from kanban.
-- Safe to run multiple times.

ALTER TABLE "Client"
ADD COLUMN IF NOT EXISTS "isDealDeleted" BOOLEAN NOT NULL DEFAULT false;

