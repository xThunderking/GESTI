CREATE TYPE "PrinterStatus" AS ENUM ('ACTIVA', 'INACTIVA', 'REPARACION', 'BAJA');

CREATE TABLE "printers" (
    "id" UUID NOT NULL,
    "area" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "status" "PrinterStatus" NOT NULL DEFAULT 'ACTIVA',
    "responsible" TEXT NOT NULL,
    "installationDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" UUID NOT NULL,
    "updatedById" UUID NOT NULL,
    "deletedById" UUID,
    CONSTRAINT "printers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "printers_serialNumber_key" ON "printers"("serialNumber");
CREATE INDEX "printers_area_idx" ON "printers"("area");
CREATE INDEX "printers_status_idx" ON "printers"("status");
CREATE INDEX "printers_deletedAt_idx" ON "printers"("deletedAt");
ALTER TABLE "printers" ADD CONSTRAINT "printers_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "printers" ADD CONSTRAINT "printers_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "printers" ADD CONSTRAINT "printers_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
