CREATE TYPE "AppNotificationType" AS ENUM (
  'BIRTHDAY_TOMORROW',
  'EVENT_SOON',
  'RSVP_MISSING',
  'URGENT_ITEM',
  'TASK_OVERDUE',
  'NEW_MESSAGE'
);

ALTER TABLE "UserNotificationPreference"
ADD COLUMN "tasksOverdueChannel" "NotificationChannel" NOT NULL DEFAULT 'APP';

CREATE TABLE "AppNotification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "AppNotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "href" TEXT,
  "triggerKey" TEXT NOT NULL,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AppNotification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AppNotification_triggerKey_key" ON "AppNotification"("triggerKey");
CREATE INDEX "AppNotification_userId_isRead_createdAt_idx" ON "AppNotification"("userId", "isRead", "createdAt");
CREATE INDEX "AppNotification_userId_type_createdAt_idx" ON "AppNotification"("userId", "type", "createdAt");

ALTER TABLE "AppNotification"
  ADD CONSTRAINT "AppNotification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;