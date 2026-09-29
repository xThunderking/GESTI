CREATE TABLE "extensions" (
    "id" UUID NOT NULL,
    "extension" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" UUID NOT NULL,
    "updatedById" UUID NOT NULL,
    "deletedById" UUID,

    CONSTRAINT "extensions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "extensions_extension_key" ON "extensions"("extension");
CREATE INDEX "extensions_area_idx" ON "extensions"("area");
CREATE INDEX "extensions_deletedAt_idx" ON "extensions"("deletedAt");

ALTER TABLE "extensions" ADD CONSTRAINT "extensions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "extensions" ADD CONSTRAINT "extensions_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "extensions" ADD CONSTRAINT "extensions_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
