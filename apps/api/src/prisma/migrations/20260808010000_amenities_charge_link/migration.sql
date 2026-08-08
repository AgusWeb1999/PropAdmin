-- AlterTable: add icon and deletedAt to common_areas
ALTER TABLE "common_areas" ADD COLUMN "icon" TEXT;
ALTER TABLE "common_areas" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable: add chargeId to reservations
ALTER TABLE "reservations" ADD COLUMN "chargeId" TEXT;
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_chargeId_key" UNIQUE ("chargeId");
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "charges"("id") ON DELETE SET NULL ON UPDATE CASCADE;
