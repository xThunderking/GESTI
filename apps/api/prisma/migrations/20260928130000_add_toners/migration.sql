CREATE TABLE "toners" (
    "id" UUID NOT NULL,
    "model" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "printerId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "updatedById" UUID NOT NULL,
    "deletedById" UUID,
    CONSTRAINT "toners_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "toners_printerId_idx" ON "toners"("printerId");
CREATE INDEX "toners_deletedAt_idx" ON "toners"("deletedAt");
ALTER TABLE "toners" ADD CONSTRAINT "toners_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "printers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "toners" ADD CONSTRAINT "toners_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "toners" ADD CONSTRAINT "toners_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "toners" ADD CONSTRAINT "toners_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
