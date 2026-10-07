ALTER TABLE "tower_ips" ALTER COLUMN "location" DROP NOT NULL;
ALTER TABLE "tower_ips" ALTER COLUMN "responsible" DROP NOT NULL;
ALTER TABLE "tower_ips" ALTER COLUMN "configuredAt" DROP NOT NULL;
ALTER TABLE "tower_ips" ALTER COLUMN "configuredAt" DROP DEFAULT;
ALTER TABLE "tower_ips" ALTER COLUMN "configuredById" DROP NOT NULL;

CREATE TABLE "tower_ip_assignments" (
    "id" UUID NOT NULL,
    "assignmentType" TEXT NOT NULL,
    "responsible" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "antenna" BOOLEAN NOT NULL DEFAULT false,
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "towerIpId" UUID NOT NULL,
    "assignedById" UUID NOT NULL,
    CONSTRAINT "tower_ip_assignments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tower_ip_assignments_towerIpId_createdAt_idx" ON "tower_ip_assignments"("towerIpId", "createdAt");

ALTER TABLE "tower_ip_assignments" ADD CONSTRAINT "tower_ip_assignments_towerIpId_fkey"
    FOREIGN KEY ("towerIpId") REFERENCES "tower_ips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tower_ip_assignments" ADD CONSTRAINT "tower_ip_assignments_assignedById_fkey"
    FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "tower_ip_assignments" (
    "id", "assignmentType", "responsible", "location", "antenna", "observations", "createdAt", "towerIpId", "assignedById"
)
SELECT gen_random_uuid(), 'ASIGNACION', "responsible", "location", "antenna", "observations", "configuredAt", "id", "configuredById"
FROM "tower_ips"
WHERE "configuredAt" IS NOT NULL AND "configuredById" IS NOT NULL;
