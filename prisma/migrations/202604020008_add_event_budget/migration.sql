CREATE TABLE "EventBudgetItem" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "plannedAmount" DECIMAL(10,2),
  "actualAmount" DECIMAL(10,2),
  "paidByName" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EventBudgetItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EventBudgetItem_eventId_createdAt_idx" ON "EventBudgetItem"("eventId", "createdAt");

ALTER TABLE "EventBudgetItem"
  ADD CONSTRAINT "EventBudgetItem_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;