-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."CircleRole" AS ENUM ('ADMIN', 'ADULTE', 'ENFANT');

-- CreateEnum
CREATE TYPE "public"."InvitePermission" AS ENUM ('ADMINS_ONLY', 'ADMINS_AND_ADULTS');

-- CreateEnum
CREATE TYPE "public"."EventType" AS ENUM ('NOEL', 'PAQUES', 'RESTAURANT', 'FETE_ENFANT', 'SOUPER_FAMILIAL', 'ANNIVERSAIRE', 'REUNION_FAMILIALE', 'AUTRE');

-- CreateEnum
CREATE TYPE "public"."RsvpResponse" AS ENUM ('JE_VIENS', 'JE_NE_VIENS_PAS', 'PEUT_ETRE');

-- CreateEnum
CREATE TYPE "public"."ContributionStatus" AS ENUM ('MANQUANT', 'URGENT', 'CONFIRME', 'APPORTE');

-- CreateEnum
CREATE TYPE "public"."NotificationChannel" AS ENUM ('APP', 'EMAIL', 'NONE');

-- CreateEnum
CREATE TYPE "public"."FamilyRelationType" AS ENUM ('PARENT_DE', 'ENFANT_DE', 'CONJOINT_DE');

-- CreateEnum
CREATE TYPE "public"."HistoryActionType" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'ASSIGN');

-- CreateEnum
CREATE TYPE "public"."HistoryObjectType" AS ENUM ('EVENT', 'CIRCLE', 'MEMBER', 'CONTRIBUTION_ITEM');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "passwordHash" TEXT,
    "name" TEXT NOT NULL,
    "image" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "timezone" TEXT,
    "isAdult" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "public"."Circle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "photoUrl" TEXT,
    "description" TEXT,
    "rules" TEXT,
    "invitePermission" "public"."InvitePermission" NOT NULL DEFAULT 'ADMINS_AND_ADULTS',
    "defaultInviteRole" "public"."CircleRole" NOT NULL DEFAULT 'ADULTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Circle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CircleMembership" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "public"."CircleRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CircleMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CircleInvite" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "defaultRole" "public"."CircleRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CircleInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PersonProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "marriageDate" TIMESTAMP(3),
    "baptismDate" TIMESTAMP(3),
    "confirmationDate" TIMESTAMP(3),
    "familyRoleLabel" TEXT,
    "allergies" TEXT,
    "foodPreferences" TEXT,
    "giftIdeas" TEXT,
    "responsibleParentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FamilyRelation" (
    "id" TEXT NOT NULL,
    "fromProfileId" TEXT NOT NULL,
    "toProfileId" TEXT NOT NULL,
    "type" "public"."FamilyRelationType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyRelation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Event" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "public"."EventType" NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "locationName" TEXT NOT NULL,
    "address" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'CIRCLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EventInvite" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EventAttendance" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "response" "public"."RsvpResponse" NOT NULL,
    "adultsCount" INTEGER NOT NULL DEFAULT 1,
    "childrenCount" INTEGER NOT NULL DEFAULT 0,
    "totalCount" INTEGER NOT NULL DEFAULT 1,
    "guestsDisplayName" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ManagedFamilyMember" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "relationLabel" TEXT,
    "birthDate" TIMESTAMP(3),
    "phone" TEXT,
    "address" TEXT,
    "allergies" TEXT,
    "foodPreferences" TEXT,
    "giftIdeas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagedFamilyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EventAttendanceLinkedMember" (
    "id" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "managedMemberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventAttendanceLinkedMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EventContributionItem" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "note" TEXT,
    "status" "public"."ContributionStatus" NOT NULL DEFAULT 'MANQUANT',
    "reservedById" TEXT,
    "reservedNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventContributionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EventComment" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "EventComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CircleMessage" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CircleMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ActionHistory" (
    "id" TEXT NOT NULL,
    "actionType" "public"."HistoryActionType" NOT NULL,
    "objectType" "public"."HistoryObjectType" NOT NULL,
    "objectId" TEXT NOT NULL,
    "objectLabel" TEXT,
    "actorUserId" TEXT NOT NULL,
    "actorDisplayName" TEXT,
    "circleId" TEXT,
    "eventId" TEXT,
    "details" JSONB,
    "previousValue" JSONB,
    "newValue" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DirectConversation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DirectConversationParticipant" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DirectConversationParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DirectMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DirectMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GiftExchange" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "drawDate" TIMESTAMP(3) NOT NULL,
    "isDrawn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GiftExchange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GiftExchangeParticipant" (
    "id" TEXT NOT NULL,
    "giftExchangeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftExchangeParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GiftExchangeAssignment" (
    "id" TEXT NOT NULL,
    "giftExchangeId" TEXT NOT NULL,
    "giverUserId" TEXT NOT NULL,
    "receiverUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftExchangeAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserNotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "birthdaysChannel" "public"."NotificationChannel" NOT NULL DEFAULT 'APP',
    "upcomingEventsChannel" "public"."NotificationChannel" NOT NULL DEFAULT 'APP',
    "rsvpMissingChannel" "public"."NotificationChannel" NOT NULL DEFAULT 'NONE',
    "urgentItemsChannel" "public"."NotificationChannel" NOT NULL DEFAULT 'NONE',
    "newMessagesChannel" "public"."NotificationChannel" NOT NULL DEFAULT 'APP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserNotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EventPhoto" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "public"."Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "public"."Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "public"."Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "public"."Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "public"."VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "public"."VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Circle_slug_key" ON "public"."Circle"("slug");

-- CreateIndex
CREATE INDEX "Circle_slug_idx" ON "public"."Circle"("slug");

-- CreateIndex
CREATE INDEX "CircleMembership_circleId_role_idx" ON "public"."CircleMembership"("circleId", "role");

-- CreateIndex
CREATE INDEX "CircleMembership_userId_idx" ON "public"."CircleMembership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CircleMembership_circleId_userId_key" ON "public"."CircleMembership"("circleId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "CircleInvite_token_key" ON "public"."CircleInvite"("token");

-- CreateIndex
CREATE INDEX "CircleInvite_circleId_idx" ON "public"."CircleInvite"("circleId");

-- CreateIndex
CREATE INDEX "CircleInvite_expiresAt_idx" ON "public"."CircleInvite"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PersonProfile_userId_key" ON "public"."PersonProfile"("userId");

-- CreateIndex
CREATE INDEX "PersonProfile_birthDate_idx" ON "public"."PersonProfile"("birthDate");

-- CreateIndex
CREATE INDEX "FamilyRelation_toProfileId_type_idx" ON "public"."FamilyRelation"("toProfileId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyRelation_fromProfileId_toProfileId_type_key" ON "public"."FamilyRelation"("fromProfileId", "toProfileId", "type");

-- CreateIndex
CREATE INDEX "Event_circleId_startsAt_idx" ON "public"."Event"("circleId", "startsAt");

-- CreateIndex
CREATE INDEX "EventInvite_userId_idx" ON "public"."EventInvite"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EventInvite_eventId_userId_key" ON "public"."EventInvite"("eventId", "userId");

-- CreateIndex
CREATE INDEX "EventAttendance_eventId_response_idx" ON "public"."EventAttendance"("eventId", "response");

-- CreateIndex
CREATE UNIQUE INDEX "EventAttendance_eventId_userId_key" ON "public"."EventAttendance"("eventId", "userId");

-- CreateIndex
CREATE INDEX "ManagedFamilyMember_ownerUserId_idx" ON "public"."ManagedFamilyMember"("ownerUserId");

-- CreateIndex
CREATE INDEX "EventAttendanceLinkedMember_managedMemberId_idx" ON "public"."EventAttendanceLinkedMember"("managedMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "EventAttendanceLinkedMember_attendanceId_managedMemberId_key" ON "public"."EventAttendanceLinkedMember"("attendanceId", "managedMemberId");

-- CreateIndex
CREATE INDEX "EventContributionItem_eventId_status_idx" ON "public"."EventContributionItem"("eventId", "status");

-- CreateIndex
CREATE INDEX "EventComment_eventId_createdAt_idx" ON "public"."EventComment"("eventId", "createdAt");

-- CreateIndex
CREATE INDEX "CircleMessage_circleId_createdAt_idx" ON "public"."CircleMessage"("circleId", "createdAt");

-- CreateIndex
CREATE INDEX "ActionHistory_createdAt_idx" ON "public"."ActionHistory"("createdAt");

-- CreateIndex
CREATE INDEX "ActionHistory_circleId_createdAt_idx" ON "public"."ActionHistory"("circleId", "createdAt");

-- CreateIndex
CREATE INDEX "ActionHistory_eventId_createdAt_idx" ON "public"."ActionHistory"("eventId", "createdAt");

-- CreateIndex
CREATE INDEX "ActionHistory_actorUserId_createdAt_idx" ON "public"."ActionHistory"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "DirectConversationParticipant_userId_idx" ON "public"."DirectConversationParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DirectConversationParticipant_conversationId_userId_key" ON "public"."DirectConversationParticipant"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "DirectMessage_conversationId_createdAt_idx" ON "public"."DirectMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "GiftExchange_circleId_drawDate_idx" ON "public"."GiftExchange"("circleId", "drawDate");

-- CreateIndex
CREATE INDEX "GiftExchangeParticipant_userId_idx" ON "public"."GiftExchangeParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GiftExchangeParticipant_giftExchangeId_userId_key" ON "public"."GiftExchangeParticipant"("giftExchangeId", "userId");

-- CreateIndex
CREATE INDEX "GiftExchangeAssignment_giftExchangeId_receiverUserId_idx" ON "public"."GiftExchangeAssignment"("giftExchangeId", "receiverUserId");

-- CreateIndex
CREATE UNIQUE INDEX "GiftExchangeAssignment_giftExchangeId_giverUserId_key" ON "public"."GiftExchangeAssignment"("giftExchangeId", "giverUserId");

-- CreateIndex
CREATE UNIQUE INDEX "UserNotificationPreference_userId_key" ON "public"."UserNotificationPreference"("userId");

-- CreateIndex
CREATE INDEX "EventPhoto_eventId_createdAt_idx" ON "public"."EventPhoto"("eventId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CircleMembership" ADD CONSTRAINT "CircleMembership_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "public"."Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CircleMembership" ADD CONSTRAINT "CircleMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CircleInvite" ADD CONSTRAINT "CircleInvite_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "public"."Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CircleInvite" ADD CONSTRAINT "CircleInvite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PersonProfile" ADD CONSTRAINT "PersonProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PersonProfile" ADD CONSTRAINT "PersonProfile_responsibleParentId_fkey" FOREIGN KEY ("responsibleParentId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FamilyRelation" ADD CONSTRAINT "FamilyRelation_fromProfileId_fkey" FOREIGN KEY ("fromProfileId") REFERENCES "public"."PersonProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FamilyRelation" ADD CONSTRAINT "FamilyRelation_toProfileId_fkey" FOREIGN KEY ("toProfileId") REFERENCES "public"."PersonProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Event" ADD CONSTRAINT "Event_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "public"."Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Event" ADD CONSTRAINT "Event_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventInvite" ADD CONSTRAINT "EventInvite_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventAttendance" ADD CONSTRAINT "EventAttendance_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventAttendance" ADD CONSTRAINT "EventAttendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ManagedFamilyMember" ADD CONSTRAINT "ManagedFamilyMember_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventAttendanceLinkedMember" ADD CONSTRAINT "EventAttendanceLinkedMember_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "public"."EventAttendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventAttendanceLinkedMember" ADD CONSTRAINT "EventAttendanceLinkedMember_managedMemberId_fkey" FOREIGN KEY ("managedMemberId") REFERENCES "public"."ManagedFamilyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventContributionItem" ADD CONSTRAINT "EventContributionItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventContributionItem" ADD CONSTRAINT "EventContributionItem_reservedById_fkey" FOREIGN KEY ("reservedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventComment" ADD CONSTRAINT "EventComment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventComment" ADD CONSTRAINT "EventComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CircleMessage" ADD CONSTRAINT "CircleMessage_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "public"."Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CircleMessage" ADD CONSTRAINT "CircleMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DirectConversationParticipant" ADD CONSTRAINT "DirectConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."DirectConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DirectConversationParticipant" ADD CONSTRAINT "DirectConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DirectMessage" ADD CONSTRAINT "DirectMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."DirectConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DirectMessage" ADD CONSTRAINT "DirectMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GiftExchange" ADD CONSTRAINT "GiftExchange_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "public"."Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GiftExchangeParticipant" ADD CONSTRAINT "GiftExchangeParticipant_giftExchangeId_fkey" FOREIGN KEY ("giftExchangeId") REFERENCES "public"."GiftExchange"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GiftExchangeParticipant" ADD CONSTRAINT "GiftExchangeParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GiftExchangeAssignment" ADD CONSTRAINT "GiftExchangeAssignment_giftExchangeId_fkey" FOREIGN KEY ("giftExchangeId") REFERENCES "public"."GiftExchange"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GiftExchangeAssignment" ADD CONSTRAINT "GiftExchangeAssignment_giverUserId_fkey" FOREIGN KEY ("giverUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GiftExchangeAssignment" ADD CONSTRAINT "GiftExchangeAssignment_receiverUserId_fkey" FOREIGN KEY ("receiverUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserNotificationPreference" ADD CONSTRAINT "UserNotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventPhoto" ADD CONSTRAINT "EventPhoto_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
