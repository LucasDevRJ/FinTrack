-- AlterTable
ALTER TABLE "users" ADD COLUMN     "pendingEmail" TEXT,
ADD COLUMN     "pendingEmailExpiresAt" TIMESTAMP(3),
ADD COLUMN     "pendingEmailTokenHash" TEXT;
