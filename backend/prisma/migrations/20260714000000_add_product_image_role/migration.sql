-- CreateEnum
CREATE TYPE "ProductImageRole" AS ENUM ('GALLERY', 'SWATCH');

-- AlterTable
ALTER TABLE "ProductImage" ADD COLUMN "image_role" "ProductImageRole" NOT NULL DEFAULT 'GALLERY';
