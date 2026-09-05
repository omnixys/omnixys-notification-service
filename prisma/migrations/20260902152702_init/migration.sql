-- CreateEnum
CREATE TYPE "channel" AS ENUM ('IN_APP', 'PUSH', 'EMAIL', 'SMS', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "content_format" AS ENUM ('TEXT', 'HTML', 'MARKDOWN');

-- CreateEnum
CREATE TYPE "priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "notification_status" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'DELIVERED', 'FAILED', 'CANCELLED', 'EXPIRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('SENT', 'DELIVERED', 'READ', 'FAILED', 'QUEUED');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "conversation_channel" AS ENUM ('WHATSAPP', 'EMAIL', 'WEBCHAT', 'SMS');

-- CreateEnum
CREATE TYPE "conversation_status" AS ENUM ('OPEN', 'ASSIGNED', 'PENDING', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "conversation_priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "internal_conversation_type" AS ENUM ('BROADCAST', 'DIRECT', 'ROLE_CHANNEL');

-- CreateEnum
CREATE TYPE "internal_message_priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "outbox_status" AS ENUM ('PENDING', 'PUBLISHED', 'FAILED');

-- CreateTable
CREATE TABLE "template" (
    "id" TEXT NOT NULL,
    "tenant_id" UUID,
    "key" TEXT NOT NULL,
    "channel" "channel" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_version" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'de-DE',
    "version" INTEGER NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "format" "content_format" NOT NULL,
    "variables" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "template_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "tenantId" UUID,
    "recipient_username" TEXT NOT NULL,
    "recipient_id" UUID,
    "recipient_address" TEXT,
    "template_id" TEXT,
    "templateVersion" INTEGER,
    "variables" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "title" TEXT,
    "body" TEXT,
    "content_format" "content_format",
    "channel" "channel" NOT NULL,
    "priority" "priority" NOT NULL DEFAULT 'NORMAL',
    "category" TEXT,
    "status" "notification_status" NOT NULL DEFAULT 'PENDING',
    "readAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "purgedAt" TIMESTAMP(3),
    "sensitive" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "provider" TEXT,
    "providerRef" TEXT,
    "failure_reason" TEXT,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_mapping" (
    "id" TEXT NOT NULL,
    "channel" "conversation_channel" NOT NULL,
    "external_id" TEXT NOT NULL,
    "event_id" TEXT,
    "conversation_id" TEXT,
    "mapping_type" TEXT NOT NULL DEFAULT 'AUTO',
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_mapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_conversation" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "invitation_id" TEXT,
    "guest_user_id" UUID,
    "guest_name" TEXT NOT NULL,
    "guest_contact" TEXT,
    "subject" TEXT,
    "status" "conversation_status" NOT NULL DEFAULT 'OPEN',
    "priority" "conversation_priority" NOT NULL DEFAULT 'NORMAL',
    "assigned_to" TEXT,
    "assigned_to_user" TEXT,
    "channel" "conversation_channel" NOT NULL,
    "last_message_at" TIMESTAMP(3),
    "last_message_preview" TEXT,
    "email_message_id" TEXT,
    "email_in_reply_to" TEXT,
    "email_references" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB DEFAULT '{}',
    "unread_count" INTEGER NOT NULL DEFAULT 0,
    "guest_unread_count" INTEGER NOT NULL DEFAULT 0,
    "sla_deadline" TIMESTAMP(3),
    "escalated_at" TIMESTAMP(3),
    "escalated_to" TEXT,
    "internal_note" TEXT,
    "deleted_at" TIMESTAMP(3),
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
    "from_user_id" UUID,
    "from_guest" BOOLEAN NOT NULL DEFAULT false,
    "body" TEXT,
    "media_url" TEXT,
    "mime_type" TEXT,
    "status" "MessageStatus" NOT NULL DEFAULT 'SENT',
    "external_id" TEXT,
    "error" TEXT,
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "edited_at" TIMESTAMP(3),
    "edit_count" INTEGER NOT NULL DEFAULT 0,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_delivery" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "channel" "conversation_channel" NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'SENT',
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "error" TEXT,
    "provider_ref" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_assignment_history" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "assigned_to" TEXT NOT NULL,
    "assigned_by" UUID NOT NULL,
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
CREATE TABLE "internal_conversation" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "internal_conversation_type" NOT NULL DEFAULT 'DIRECT',
    "role_id" TEXT,
    "participant_hash" TEXT,
    "created_by" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "internal_conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "sender_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "priority" "internal_message_priority" NOT NULL DEFAULT 'NORMAL',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "edited_at" TIMESTAMP(3),

    CONSTRAINT "internal_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_participant" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "last_read_at" TIMESTAMP(3),
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),

    CONSTRAINT "internal_participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_access_projection" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "roles" JSONB,
    "occurred_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "event_access_projection_pkey" PRIMARY KEY ("id")
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
    "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_at" TIMESTAMP(3),
    "locked_by" TEXT,
    "dead_lettered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "published_at" TIMESTAMP(3),

    CONSTRAINT "outbox_message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "template_tenant_id_key_channel_key" ON "template"("tenant_id", "key", "channel");

-- CreateIndex
CREATE INDEX "template_version_templateId_locale_isActive_idx" ON "template_version"("templateId", "locale", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "template_version_templateId_locale_version_key" ON "template_version"("templateId", "locale", "version");

-- CreateIndex
CREATE INDEX "notification_status_created_at_idx" ON "notification"("status", "created_at");

-- CreateIndex
CREATE INDEX "notification_tenantId_status_idx" ON "notification"("tenantId", "status");

-- CreateIndex
CREATE INDEX "notification_recipient_username_created_at_idx" ON "notification"("recipient_username", "created_at");

-- CreateIndex
CREATE INDEX "notification_expiresAt_idx" ON "notification"("expiresAt");

-- CreateIndex
CREATE INDEX "conversation_mapping_channel_external_id_idx" ON "conversation_mapping"("channel", "external_id");

-- CreateIndex
CREATE INDEX "conversation_mapping_conversation_id_idx" ON "conversation_mapping"("conversation_id");

-- CreateIndex
CREATE INDEX "conversation_mapping_event_id_idx" ON "conversation_mapping"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_mapping_channel_external_id_event_id_key" ON "conversation_mapping"("channel", "external_id", "event_id");

-- CreateIndex
CREATE INDEX "support_conversation_event_id_idx" ON "support_conversation"("event_id");

-- CreateIndex
CREATE INDEX "support_conversation_guest_user_id_idx" ON "support_conversation"("guest_user_id");

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
CREATE INDEX "support_conversation_email_message_id_idx" ON "support_conversation"("email_message_id");

-- CreateIndex
CREATE INDEX "support_conversation_deleted_at_idx" ON "support_conversation"("deleted_at");

-- CreateIndex
CREATE INDEX "support_message_conversationId_idx" ON "support_message"("conversationId");

-- CreateIndex
CREATE INDEX "support_message_created_at_idx" ON "support_message"("created_at");

-- CreateIndex
CREATE INDEX "support_message_deleted_at_idx" ON "support_message"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "support_message_conversationId_external_id_key" ON "support_message"("conversationId", "external_id");

-- CreateIndex
CREATE INDEX "message_delivery_messageId_idx" ON "message_delivery"("messageId");

-- CreateIndex
CREATE INDEX "message_delivery_status_idx" ON "message_delivery"("status");

-- CreateIndex
CREATE INDEX "message_delivery_channel_status_idx" ON "message_delivery"("channel", "status");

-- CreateIndex
CREATE INDEX "support_assignment_history_conversationId_idx" ON "support_assignment_history"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "support_quick_reply_key_key" ON "support_quick_reply"("key");

-- CreateIndex
CREATE INDEX "internal_conversation_event_id_idx" ON "internal_conversation"("event_id");

-- CreateIndex
CREATE INDEX "internal_conversation_type_idx" ON "internal_conversation"("type");

-- CreateIndex
CREATE INDEX "internal_conversation_event_id_type_idx" ON "internal_conversation"("event_id", "type");

-- CreateIndex
CREATE INDEX "internal_conversation_role_id_idx" ON "internal_conversation"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "internal_conversation_event_id_type_participant_hash_key" ON "internal_conversation"("event_id", "type", "participant_hash");

-- CreateIndex
CREATE INDEX "internal_message_conversationId_idx" ON "internal_message"("conversationId");

-- CreateIndex
CREATE INDEX "internal_message_sender_id_idx" ON "internal_message"("sender_id");

-- CreateIndex
CREATE INDEX "internal_message_created_at_idx" ON "internal_message"("created_at");

-- CreateIndex
CREATE INDEX "internal_participant_user_id_idx" ON "internal_participant"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "internal_participant_conversationId_user_id_key" ON "internal_participant"("conversationId", "user_id");

-- CreateIndex
CREATE INDEX "idx_event_access_projection_event" ON "event_access_projection"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_access_projection_event_id_user_id_key" ON "event_access_projection"("event_id", "user_id");

-- CreateIndex
CREATE INDEX "outbox_message_status_next_attempt_at_created_at_idx" ON "outbox_message"("status", "next_attempt_at", "created_at");

-- CreateIndex
CREATE INDEX "outbox_message_status_attempt_idx" ON "outbox_message"("status", "attempt");

-- AddForeignKey
ALTER TABLE "template_version" ADD CONSTRAINT "template_version_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_mapping" ADD CONSTRAINT "conversation_mapping_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "support_conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_message" ADD CONSTRAINT "support_message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "support_conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_delivery" ADD CONSTRAINT "message_delivery_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "support_message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_assignment_history" ADD CONSTRAINT "support_assignment_history_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "support_conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_message" ADD CONSTRAINT "internal_message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "internal_conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_participant" ADD CONSTRAINT "internal_participant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "internal_conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
