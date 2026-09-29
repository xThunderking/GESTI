CREATE TABLE "areas" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" UUID NOT NULL,
    "updatedById" UUID NOT NULL,
    "deletedById" UUID,
    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "areas_name_key" ON "areas"("name");
CREATE INDEX "areas_deletedAt_idx" ON "areas"("deletedAt");
ALTER TABLE "areas" ADD CONSTRAINT "areas_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "areas" ADD CONSTRAINT "areas_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "areas" ADD CONSTRAINT "areas_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
