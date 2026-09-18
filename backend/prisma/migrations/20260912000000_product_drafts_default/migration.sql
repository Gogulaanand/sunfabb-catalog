ALTER TABLE "Product" ADD COLUMN "published_at" TIMESTAMP(3);

-- Existing products were auto-published before the admin lifecycle existed.
-- Preserve that historical publication fact so inactive legacy rows are Hidden,
-- while newly created rows remain Draft until an explicit publish.
UPDATE "Product" SET "published_at" = "created_at" WHERE "published_at" IS NULL;

ALTER TABLE "Product" ALTER COLUMN "is_active" SET DEFAULT false;
