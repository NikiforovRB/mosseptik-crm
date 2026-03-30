-- Apply all updates after initial schema.
-- Safe to run multiple times.

-- 1) Client.phone (optional)
ALTER TABLE "Client"
ADD COLUMN IF NOT EXISTS "phone" TEXT;

-- 2) Default stage header color
ALTER TABLE "FunnelStage"
ALTER COLUMN "headerColor" SET DEFAULT '#ccd0e1';

