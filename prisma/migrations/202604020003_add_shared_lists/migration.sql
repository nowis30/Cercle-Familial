CREATE TYPE "SharedListType" AS ENUM ('EPICERIE', 'LISTE_LIBRE', 'PREPARATION_FETE', 'ACHATS_CADEAUX');

CREATE TABLE "SharedList" (
  "id" TEXT NOT NULL,
  "circleId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "type" "SharedListType" NOT NULL DEFAULT 'LISTE_LIBRE',
  "note" TEXT,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SharedList_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SharedListItem" (
  "id" TEXT NOT NULL,
  "listId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "checkedById" TEXT,
  "assigneeUserId" TEXT,
  "label" TEXT NOT NULL,
  "comment" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0,
  "isChecked" BOOLEAN NOT NULL DEFAULT false,
  "checkedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SharedListItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SharedList_circleId_isArchived_idx" ON "SharedList"("circleId", "isArchived");
CREATE INDEX "SharedList_createdById_createdAt_idx" ON "SharedList"("createdById", "createdAt");
CREATE INDEX "SharedListItem_listId_position_idx" ON "SharedListItem"("listId", "position");
CREATE INDEX "SharedListItem_listId_isChecked_idx" ON "SharedListItem"("listId", "isChecked");
CREATE INDEX "SharedListItem_assigneeUserId_idx" ON "SharedListItem"("assigneeUserId");

ALTER TABLE "SharedList"
  ADD CONSTRAINT "SharedList_circleId_fkey"
  FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SharedList"
  ADD CONSTRAINT "SharedList_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SharedListItem"
  ADD CONSTRAINT "SharedListItem_listId_fkey"
  FOREIGN KEY ("listId") REFERENCES "SharedList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SharedListItem"
  ADD CONSTRAINT "SharedListItem_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SharedListItem"
  ADD CONSTRAINT "SharedListItem_checkedById_fkey"
  FOREIGN KEY ("checkedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SharedListItem"
  ADD CONSTRAINT "SharedListItem_assigneeUserId_fkey"
  FOREIGN KEY ("assigneeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
