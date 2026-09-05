-- CreateEnum
CREATE TYPE "TerminalSessionStatus" AS ENUM ('CREATING', 'RUNNING', 'CLOSED', 'EXPIRED', 'FAILED');

-- CreateTable
CREATE TABLE "TerminalSession" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" "TerminalSessionStatus" NOT NULL DEFAULT 'CREATING',
    "containerId" TEXT,
    "ttlSeconds" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TerminalSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TerminalSession_userId_idx" ON "TerminalSession"("userId");

-- CreateIndex
CREATE INDEX "TerminalSession_status_expiresAt_idx" ON "TerminalSession"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "TerminalSession_status_idx" ON "TerminalSession"("status");

-- AddForeignKey
ALTER TABLE "TerminalSession" ADD CONSTRAINT "TerminalSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
