-- Client.requisites: free-text bank / company details on deal
-- Safe to run multiple times.

ALTER TABLE public."Client"
ADD COLUMN IF NOT EXISTS "requisites" TEXT NOT NULL DEFAULT '';
