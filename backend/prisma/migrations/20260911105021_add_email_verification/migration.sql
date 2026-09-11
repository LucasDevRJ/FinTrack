-- AlterTable
ALTER TABLE "users" ADD COLUMN     "emailVerificationExpiresAt" TIMESTAMP(3),
ADD COLUMN     "emailVerificationTokenHash" TEXT,
ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3);

-- Grandfather in every account that already existed before this feature
-- shipped (issue #41) — otherwise every real user registered so far,
-- including the demo account's underlying row, would suddenly be locked
-- out of login by loginUser's new "email verified?" check. Same pattern as
-- the #29 budget-goal migration: existing data keeps working, only new
-- signups go through the new flow.
UPDATE "users" SET "emailVerifiedAt" = "createdAt" WHERE "emailVerifiedAt" IS NULL;
