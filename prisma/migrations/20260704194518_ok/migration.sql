-- CreateEnum
CREATE TYPE "conversation_channel" AS ENUM ('WHATSAPP', 'EMAIL', 'WEBCHAT', 'SMS', 'TELEGRAM', 'SIGNAL', 'FACEBOOK_MESSENGER', 'PUSH_CHAT');

-- CreateEnum
CREATE TYPE "conversation_status" AS ENUM ('OPEN', 'ASSIGNED', 'CLOSED');

-- CreateEnum
CREATE TYPE "conversation_priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "outbox_status" AS ENUM ('PENDING', 'PUBLISHED', 'FAILED');

-- CreateTable
CREATE TABLE "support_conversation" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "invitation_id" TEXT,
    "guest_user_id" TEXT,
    "guest_name" TEXT NOT NULL,
    "guest_contact" TEXT,
    "subject" TEXT,
    "status" "conversation_status" NOT NULL DEFAULT 'OPEN',
    "priority" "conversation_priority" NOT NULL DEFAULT 'NORMAL',
    "assigned_to" TEXT,
    "channel" "conversation_channel" NOT NULL,
    "last_message_at" TIMESTAMP(3),
    "last_message_preview" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "support_conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "direction" "MessageDirection" NOT NULL,
    "channel" "conversation_channel" NOT NULL,
    "from_user_id" TEXT,
    "from_guest" BOOLEAN NOT NULL DEFAULT false,
    "body" TEXT,
    "media_url" TEXT,
    "mime_type" TEXT,
    "status" "MessageStatus" NOT NULL DEFAULT 'SENT',
    "external_id" TEXT,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_assignment_history" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "assigned_to" TEXT NOT NULL,
    "assigned_by" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_assignment_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_quick_reply" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "channel" "conversation_channel",
    "tags" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_quick_reply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_message" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "key" TEXT,
    "headers" JSONB DEFAULT '{}',
    "status" "outbox_status" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "max_retry" INTEGER NOT NULL DEFAULT 5,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "published_at" TIMESTAMP(3),

    CONSTRAINT "outbox_message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "support_conversation_event_id_idx" ON "support_conversation"("event_id");

-- CreateIndex
CREATE INDEX "support_conversation_assigned_to_idx" ON "support_conversation"("assigned_to");

-- CreateIndex
CREATE INDEX "support_conversation_status_idx" ON "support_conversation"("status");

-- CreateIndex
CREATE INDEX "support_conversation_event_id_status_idx" ON "support_conversation"("event_id", "status");

-- CreateIndex
CREATE INDEX "support_conversation_assigned_to_status_idx" ON "support_conversation"("assigned_to", "status");

-- CreateIndex
CREATE INDEX "support_conversation_created_at_idx" ON "support_conversation"("created_at");

-- CreateIndex
CREATE INDEX "support_message_conversationId_idx" ON "support_message"("conversationId");

-- CreateIndex
CREATE INDEX "support_message_created_at_idx" ON "support_message"("created_at");

-- CreateIndex
CREATE INDEX "support_assignment_history_conversationId_idx" ON "support_assignment_history"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "support_quick_reply_key_key" ON "support_quick_reply"("key");

-- CreateIndex
CREATE INDEX "outbox_message_status_created_at_idx" ON "outbox_message"("status", "created_at");

-- CreateIndex
CREATE INDEX "outbox_message_status_attempt_idx" ON "outbox_message"("status", "attempt");

-- AddForeignKey
ALTER TABLE "support_message" ADD CONSTRAINT "support_message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "support_conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_assignment_history" ADD CONSTRAINT "support_assignment_history_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "support_conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
