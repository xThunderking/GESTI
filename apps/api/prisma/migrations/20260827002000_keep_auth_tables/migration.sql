-- DropForeignKey
ALTER TABLE "assets" DROP CONSTRAINT "assets_assignedToId_fkey";

-- DropForeignKey
ALTER TABLE "assets" DROP CONSTRAINT "assets_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_userId_fkey";

-- DropForeignKey
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_assetId_fkey";

-- DropForeignKey
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_assigneeId_fkey";

-- DropForeignKey
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_requesterId_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_departmentId_fkey";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "departmentId";

-- DropTable
DROP TABLE "assets";

-- DropTable
DROP TABLE "audit_logs";

-- DropTable
DROP TABLE "departments";

-- DropTable
DROP TABLE "tickets";

-- DropEnum
DROP TYPE "AssetStatus";

-- DropEnum
DROP TYPE "TicketPriority";

-- DropEnum
DROP TYPE "TicketStatus";
