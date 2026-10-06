ALTER TABLE "printers" ADD COLUMN "ip" TEXT;

CREATE UNIQUE INDEX "printers_ip_key" ON "printers"("ip");
