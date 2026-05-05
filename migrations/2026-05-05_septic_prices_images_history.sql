-- Septic models: prices + image + history of changes.
-- Safe to run multiple times.

ALTER TABLE public."SepticModel"
ADD COLUMN IF NOT EXISTS "purchasePrice" INTEGER,
ADD COLUMN IF NOT EXISTS "salePrice" INTEGER,
ADD COLUMN IF NOT EXISTS "imageOriginalKey" TEXT,
ADD COLUMN IF NOT EXISTS "imageWebpKey" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'SepticPriceKind'
  ) THEN
    CREATE TYPE public."SepticPriceKind" AS ENUM ('PURCHASE', 'SALE');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public."SepticPriceHistory" (
  "id" TEXT NOT NULL,
  "septicModelId" TEXT NOT NULL,
  "kind" public."SepticPriceKind" NOT NULL,
  "price" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SepticPriceHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SepticPriceHistory_septicModelId_kind_createdAt_idx"
  ON public."SepticPriceHistory" ("septicModelId", "kind", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SepticPriceHistory_septicModelId_fkey'
  ) THEN
    ALTER TABLE public."SepticPriceHistory"
    ADD CONSTRAINT "SepticPriceHistory_septicModelId_fkey"
    FOREIGN KEY ("septicModelId") REFERENCES public."SepticModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
