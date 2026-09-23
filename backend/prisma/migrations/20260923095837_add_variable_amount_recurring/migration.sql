-- CreateEnum
CREATE TYPE "RecurringOccurrenceStatus" AS ENUM ('CONFIRMED', 'SKIPPED');

-- AlterTable
ALTER TABLE "recurring_transactions" ADD COLUMN     "variableAmount" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "amount" DROP NOT NULL;

-- CreateTable
CREATE TABLE "recurring_occurrences" (
    "id" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "RecurringOccurrenceStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recurringTransactionId" TEXT NOT NULL,
    "transactionId" TEXT,

    CONSTRAINT "recurring_occurrences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recurring_occurrences_transactionId_key" ON "recurring_occurrences"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "recurring_occurrences_recurringTransactionId_dueDate_key" ON "recurring_occurrences"("recurringTransactionId", "dueDate");

-- AddForeignKey
ALTER TABLE "recurring_occurrences" ADD CONSTRAINT "recurring_occurrences_recurringTransactionId_fkey" FOREIGN KEY ("recurringTransactionId") REFERENCES "recurring_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_occurrences" ADD CONSTRAINT "recurring_occurrences_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
