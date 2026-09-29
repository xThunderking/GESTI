CREATE TABLE "tower_ips" (
    "id" UUID NOT NULL,
    "ip" TEXT NOT NULL,
    "office" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "responsible" TEXT NOT NULL,
    "antenna" BOOLEAN NOT NULL DEFAULT false,
    "observations" TEXT,
    "configuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "configuredById" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "updatedById" UUID NOT NULL,
    "deletedById" UUID,
    CONSTRAINT "tower_ips_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tower_ips_ip_key" ON "tower_ips"("ip");
CREATE INDEX "tower_ips_office_idx" ON "tower_ips"("office");
CREATE INDEX "tower_ips_deletedAt_idx" ON "tower_ips"("deletedAt");
ALTER TABLE "tower_ips" ADD CONSTRAINT "tower_ips_configuredById_fkey" FOREIGN KEY ("configuredById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tower_ips" ADD CONSTRAINT "tower_ips_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tower_ips" ADD CONSTRAINT "tower_ips_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tower_ips" ADD CONSTRAINT "tower_ips_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
