CREATE TABLE "haq_ips" (
    "id" UUID NOT NULL,
    "ip" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "responsible" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" UUID NOT NULL,
    "updatedById" UUID NOT NULL,
    "deletedById" UUID,

    CONSTRAINT "haq_ips_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "haq_ips_ip_key" ON "haq_ips"("ip");
CREATE INDEX "haq_ips_area_idx" ON "haq_ips"("area");
CREATE INDEX "haq_ips_deletedAt_idx" ON "haq_ips"("deletedAt");

ALTER TABLE "haq_ips" ADD CONSTRAINT "haq_ips_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "haq_ips" ADD CONSTRAINT "haq_ips_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "haq_ips" ADD CONSTRAINT "haq_ips_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
