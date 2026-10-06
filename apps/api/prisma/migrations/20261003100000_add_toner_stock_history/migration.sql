CREATE TABLE "toner_movements" (
    "id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "tonerModel" TEXT NOT NULL,
    "printerName" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tonerId" UUID NOT NULL,
    "printerId" UUID NOT NULL,
    "userId" UUID NOT NULL,

    CONSTRAINT "toner_movements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "toner_movements_tonerId_createdAt_idx" ON "toner_movements"("tonerId", "createdAt");

ALTER TABLE "toner_movements" ADD CONSTRAINT "toner_movements_tonerId_fkey"
    FOREIGN KEY ("tonerId") REFERENCES "toners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "toner_movements" ADD CONSTRAINT "toner_movements_printerId_fkey"
    FOREIGN KEY ("printerId") REFERENCES "printers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "toner_movements" ADD CONSTRAINT "toner_movements_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
