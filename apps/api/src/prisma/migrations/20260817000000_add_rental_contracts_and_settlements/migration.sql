-- CreateEnum
CREATE TYPE "BuildingType" AS ENUM ('EDIFICIO', 'COMPLEJO', 'CASA');
CREATE TYPE "ContractStatus" AS ENUM ('ACTIVE', 'TERMINATED');
CREATE TYPE "SettlementStatus" AS ENUM ('PENDING', 'TRANSFERRED');

-- AlterTable: buildings
ALTER TABLE "buildings" ADD COLUMN "type" "BuildingType" NOT NULL DEFAULT 'EDIFICIO';

-- AlterTable: charges
ALTER TABLE "charges" ADD COLUMN "rentalContractId" TEXT;

-- CreateTable: rental_contracts
CREATE TABLE "rental_contracts" (
    "id"               TEXT NOT NULL,
    "apartmentId"      TEXT NOT NULL,
    "ownerResidentId"  TEXT NOT NULL,
    "tenantResidentId" TEXT NOT NULL,
    "rentAmount"       DECIMAL(12,2) NOT NULL,
    "commissionPct"    DECIMAL(5,4) NOT NULL,
    "currency"         TEXT NOT NULL DEFAULT 'UYU',
    "startDate"        TIMESTAMP(3) NOT NULL,
    "endDate"          TIMESTAMP(3),
    "status"           "ContractStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes"            TEXT,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,
    "deletedAt"        TIMESTAMP(3),

    CONSTRAINT "rental_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable: settlements
CREATE TABLE "settlements" (
    "id"               TEXT NOT NULL,
    "rentalContractId" TEXT NOT NULL,
    "chargeId"         TEXT,
    "period"           TEXT NOT NULL,
    "rentAmount"       DECIMAL(12,2) NOT NULL,
    "rentCollected"    DECIMAL(12,2) NOT NULL,
    "commissionAmount" DECIMAL(12,2) NOT NULL,
    "deductionsDetail" JSONB,
    "netToOwner"       DECIMAL(12,2) NOT NULL,
    "status"           "SettlementStatus" NOT NULL DEFAULT 'PENDING',
    "transferredAt"    TIMESTAMP(3),
    "notes"            TEXT,
    "generatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,
    "deletedAt"        TIMESTAMP(3),

    CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "charges_rentalContractId_period_idx" ON "charges"("rentalContractId", "period");

CREATE INDEX "rental_contracts_apartmentId_idx" ON "rental_contracts"("apartmentId");
CREATE INDEX "rental_contracts_ownerResidentId_idx" ON "rental_contracts"("ownerResidentId");
CREATE INDEX "rental_contracts_tenantResidentId_idx" ON "rental_contracts"("tenantResidentId");

CREATE UNIQUE INDEX "settlements_chargeId_key" ON "settlements"("chargeId");
CREATE UNIQUE INDEX "settlements_rentalContractId_period_key" ON "settlements"("rentalContractId", "period");

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_rentalContractId_fkey"
    FOREIGN KEY ("rentalContractId") REFERENCES "rental_contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "rental_contracts" ADD CONSTRAINT "rental_contracts_apartmentId_fkey"
    FOREIGN KEY ("apartmentId") REFERENCES "apartments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rental_contracts" ADD CONSTRAINT "rental_contracts_ownerResidentId_fkey"
    FOREIGN KEY ("ownerResidentId") REFERENCES "residents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rental_contracts" ADD CONSTRAINT "rental_contracts_tenantResidentId_fkey"
    FOREIGN KEY ("tenantResidentId") REFERENCES "residents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "settlements" ADD CONSTRAINT "settlements_rentalContractId_fkey"
    FOREIGN KEY ("rentalContractId") REFERENCES "rental_contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_chargeId_fkey"
    FOREIGN KEY ("chargeId") REFERENCES "charges"("id") ON DELETE SET NULL ON UPDATE CASCADE;
