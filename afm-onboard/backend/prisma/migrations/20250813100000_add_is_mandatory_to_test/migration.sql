-- Add column isMandatory to Test
ALTER TABLE "public"."Test"
ADD COLUMN IF NOT EXISTS "isMandatory" BOOLEAN NOT NULL DEFAULT false;




