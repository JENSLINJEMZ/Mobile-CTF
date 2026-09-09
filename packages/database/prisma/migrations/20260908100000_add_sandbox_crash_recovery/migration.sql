-- AddEnumValue
ALTER TYPE "TerminalSessionStatus" ADD VALUE 'CRASHED';

-- AlterTable
ALTER TABLE "TerminalSession" ADD COLUMN "crashReason" TEXT;