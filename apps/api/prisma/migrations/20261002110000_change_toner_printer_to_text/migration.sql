ALTER TABLE "toners" ADD COLUMN "printerName" TEXT;

UPDATE "toners" AS toner
SET "printerName" = COALESCE(
  (
    SELECT printer."model" || ' · ' || printer."serialNumber" || ' · ' || printer."area"
    FROM "printers" AS printer
    WHERE printer."id" = toner."printerId"
  ),
  'No especificada'
);

ALTER TABLE "toners" ALTER COLUMN "printerName" SET NOT NULL;
ALTER TABLE "toners" DROP CONSTRAINT "toners_printerId_fkey";
DROP INDEX "toners_printerId_idx";
ALTER TABLE "toners" DROP COLUMN "printerId";
