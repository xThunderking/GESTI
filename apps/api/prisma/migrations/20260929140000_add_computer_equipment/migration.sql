CREATE TABLE "computer_equipment" (
    "id" UUID NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "ciId" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "equipmentDate" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "responsible" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" UUID NOT NULL,
    "updatedById" UUID NOT NULL,
    "deletedById" UUID,

    CONSTRAINT "computer_equipment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "computer_equipment_serialNumber_key" ON "computer_equipment"("serialNumber");
CREATE UNIQUE INDEX "computer_equipment_ip_key" ON "computer_equipment"("ip");
CREATE UNIQUE INDEX "computer_equipment_ciId_key" ON "computer_equipment"("ciId");
CREATE INDEX "computer_equipment_assetType_idx" ON "computer_equipment"("assetType");
CREATE INDEX "computer_equipment_location_idx" ON "computer_equipment"("location");
CREATE INDEX "computer_equipment_deletedAt_idx" ON "computer_equipment"("deletedAt");

ALTER TABLE "computer_equipment" ADD CONSTRAINT "computer_equipment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "computer_equipment" ADD CONSTRAINT "computer_equipment_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "computer_equipment" ADD CONSTRAINT "computer_equipment_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
