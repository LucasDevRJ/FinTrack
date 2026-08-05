-- CreateTable
CREATE TABLE "budget_goals" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "monthlyLimit" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "budget_goals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "budget_goals_userId_category_key" ON "budget_goals"("userId", "category");

-- AddForeignKey
ALTER TABLE "budget_goals" ADD CONSTRAINT "budget_goals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
