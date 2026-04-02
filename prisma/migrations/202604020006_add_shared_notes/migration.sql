CREATE TABLE "SharedNote" (
  "id" TEXT NOT NULL,
  "circleId" TEXT NOT NULL,
  "eventId" TEXT,
  "createdById" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "isPinned" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SharedNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SharedNote_circleId_eventId_isPinned_createdAt_idx" ON "SharedNote"("circleId", "eventId", "isPinned", "createdAt");
CREATE INDEX "SharedNote_createdById_createdAt_idx" ON "SharedNote"("createdById", "createdAt");

ALTER TABLE "SharedNote"
  ADD CONSTRAINT "SharedNote_circleId_fkey"
  FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SharedNote"
  ADD CONSTRAINT "SharedNote_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SharedNote"
  ADD CONSTRAINT "SharedNote_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;