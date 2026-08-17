-- CreateTable: ipc_indexes
CREATE TABLE "ipc_indexes" (
    "id"        TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "year"      INTEGER NOT NULL,
    "month"     INTEGER NOT NULL,
    "value"     DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ipc_indexes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ipc_indexes_companyId_year_month_key" ON "ipc_indexes"("companyId", "year", "month");
CREATE INDEX "ipc_indexes_companyId_idx" ON "ipc_indexes"("companyId");

-- AddForeignKey
ALTER TABLE "ipc_indexes" ADD CONSTRAINT "ipc_indexes_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
