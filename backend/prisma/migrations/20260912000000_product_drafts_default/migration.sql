ALTER TABLE "Product"
  ADD COLUMN "published_at" TIMESTAMP(3),
  ADD COLUMN "measured_width_cm" DOUBLE PRECISION,
  ADD COLUMN "measured_length_cm" DOUBLE PRECISION,
  ADD COLUMN "set_contents" TEXT;

-- Existing products were auto-published before the admin lifecycle existed.
-- Preserve that historical publication fact so inactive legacy rows are Hidden,
-- while newly created rows remain Draft until an explicit publish.
UPDATE "Product" SET "published_at" = "created_at" WHERE "published_at" IS NULL;

-- Existing rows predate the owner-fact fields. Fail closed so no product can
-- remain customer-visible with unverified dimensions/set contents or known
-- operator-only copy. Soft-hiding preserves every row for admin repair and
-- later restore.
UPDATE "Product"
SET "is_active" = false
WHERE "is_active" = true
  AND (
    "description" IS NULL
    OR btrim("description") = ''
    OR "description" ~* '\m(admin(\s+catalog)?|internal|placeholder|refine|tbd|todo)\M'
    OR "care_instructions" IS NULL
    OR btrim("care_instructions") = ''
    OR "measured_width_cm" IS NULL
    OR "measured_length_cm" IS NULL
    OR "set_contents" IS NULL
    OR btrim("set_contents") = ''
  );

ALTER TABLE "Product" ALTER COLUMN "is_active" SET DEFAULT false;
