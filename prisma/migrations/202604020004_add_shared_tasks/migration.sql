ALTER TABLE "SharedListItem"
ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1;

CREATE TYPE "SharedTaskStatus" AS ENUM ('A_FAIRE', 'EN_COURS', 'TERMINE');
CREATE TYPE "SharedTaskPriority" AS ENUM ('NORMALE', 'IMPORTANTE', 'URGENTE');

CREATE TABLE "SharedTask" (
  "id" TEXT NOT NULL,
  "circleId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "assigneeUserId" TEXT,
  "title" TEXT NOT NULL,
  "note" TEXT,
  "dueAt" TIMESTAMP(3),
  "status" "SharedTaskStatus" NOT NULL DEFAULT 'A_FAIRE',
  "priority" "SharedTaskPriority" NOT NULL DEFAULT 'NORMALE',
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SharedTask_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SharedTask_circleId_status_priority_idx" ON "SharedTask"("circleId", "status", "priority");
CREATE INDEX "SharedTask_circleId_dueAt_idx" ON "SharedTask"("circleId", "dueAt");
CREATE INDEX "SharedTask_assigneeUserId_status_dueAt_idx" ON "SharedTask"("assigneeUserId", "status", "dueAt");

ALTER TABLE "SharedTask"
  ADD CONSTRAINT "SharedTask_circleId_fkey"
  FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SharedTask"
  ADD CONSTRAINT "SharedTask_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SharedTask"
  ADD CONSTRAINT "SharedTask_assigneeUserId_fkey"
  FOREIGN KEY ("assigneeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;