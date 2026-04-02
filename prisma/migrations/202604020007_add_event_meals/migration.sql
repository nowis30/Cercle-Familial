CREATE TABLE "EventMeal" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "linkedListId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "recipe" TEXT,
  "servedAtLabel" TEXT,
  "isPinned" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EventMeal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EventMeal_eventId_isPinned_createdAt_idx" ON "EventMeal"("eventId", "isPinned", "createdAt");
CREATE INDEX "EventMeal_linkedListId_idx" ON "EventMeal"("linkedListId");

ALTER TABLE "EventMeal"
  ADD CONSTRAINT "EventMeal_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventMeal"
  ADD CONSTRAINT "EventMeal_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventMeal"
  ADD CONSTRAINT "EventMeal_linkedListId_fkey"
  FOREIGN KEY ("linkedListId") REFERENCES "SharedList"("id") ON DELETE SET NULL ON UPDATE CASCADE;