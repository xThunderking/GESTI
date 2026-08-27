ALTER TABLE "users"
ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT true;

UPDATE "users"
SET "mustChangePassword" = false
WHERE "email" = 'admin@gesti.local';
