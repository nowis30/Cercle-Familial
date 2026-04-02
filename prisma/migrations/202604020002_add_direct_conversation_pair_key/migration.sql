ALTER TABLE "DirectConversation"
ADD COLUMN "pairKey" TEXT;

CREATE UNIQUE INDEX "DirectConversation_pairKey_key" ON "DirectConversation"("pairKey");