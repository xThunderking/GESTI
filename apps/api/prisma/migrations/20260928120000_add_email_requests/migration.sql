CREATE TABLE "email_requests" (
    "id" UUID NOT NULL,
    "requestDate" TIMESTAMP(3) NOT NULL,
    "fullName" TEXT NOT NULL,
    "collaboratorNo" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "justification" TEXT NOT NULL,
    "suggestedEmail" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "requestingBoss" TEXT NOT NULL,
    "areaDirector" TEXT NOT NULL,
    "tiResponsible" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "lastGeneratedAt" TIMESTAMP(3),
    "createdById" UUID NOT NULL,
    "updatedById" UUID NOT NULL,
    "deletedById" UUID,
    CONSTRAINT "email_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "email_requests_collaboratorNo_idx" ON "email_requests"("collaboratorNo");
CREATE INDEX "email_requests_requestDate_idx" ON "email_requests"("requestDate");
CREATE INDEX "email_requests_deletedAt_idx" ON "email_requests"("deletedAt");
ALTER TABLE "email_requests" ADD CONSTRAINT "email_requests_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "email_requests" ADD CONSTRAINT "email_requests_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "email_requests" ADD CONSTRAINT "email_requests_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
