-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "notification";

-- CreateEnum
CREATE TYPE "notification"."channel" AS ENUM ('IN_APP', 'PUSH', 'EMAIL', 'SMS', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "notification"."content_format" AS ENUM ('TEXT', 'HTML', 'MARKDOWN');

-- CreateEnum
CREATE TYPE "notification"."priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "notification"."notification_status" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'DELIVERED', 'FAILED', 'CANCELLED', 'EXPIRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "notification"."delivery_attempt_status" AS ENUM ('SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "notification"."WebhookEventType" AS ENUM ('DELIVERED', 'BOUNCED', 'OPENED', 'CLICKED', 'REJECTED');

-- CreateEnum
CREATE TYPE "notification"."ChatStatus" AS ENUM ('OPEN', 'ASSIGNED', 'CLOSED');

-- CreateEnum
CREATE TYPE "notification"."MessageStatus" AS ENUM ('SENT', 'DELIVERED', 'READ', 'FAILED', 'QUEUED');

-- CreateEnum
CREATE TYPE "notification"."MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateTable
CREATE TABLE "notification"."tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification"."template" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "key" TEXT NOT NULL,
    "channel" "notification"."channel" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification"."template_version" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'de-DE',
    "version" INTEGER NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "format" "notification"."content_format" NOT NULL,
    "variables" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "template_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification"."notification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "recipient_username" TEXT NOT NULL,
    "recipient_id" TEXT,
    "recipient_address" TEXT,
    "template_id" TEXT,
    "templateVersion" INTEGER,
    "variables" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "channel" "notification"."channel" NOT NULL,
    "priority" "notification"."priority" NOT NULL DEFAULT 'NORMAL',
    "category" TEXT,
    "status" "notification"."notification_status" NOT NULL DEFAULT 'PENDING',
    "readAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "purgedAt" TIMESTAMP(3),
    "sensitive" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "provider" TEXT,
    "providerRef" TEXT,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification"."WhatsAppChat" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "name" TEXT,
    "isGroup" BOOLEAN NOT NULL DEFAULT false,
    "phone" TEXT,
    "assignedTo" TEXT,
    "status" "notification"."ChatStatus" NOT NULL DEFAULT 'OPEN',
    "lastMessageAt" TIMESTAMP(3),
    "lastMessagePreview" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppChat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification"."WhatsAppMessage" (
    "id" TEXT NOT NULL,
    "chatRefId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "direction" "notification"."MessageDirection" NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "body" TEXT,
    "mediaUrl" TEXT,
    "mimeType" TEXT,
    "messageId" TEXT,
    "status" "notification"."MessageStatus" NOT NULL DEFAULT 'SENT',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification"."WhatsAppAssignmentHistory" (
    "id" TEXT NOT NULL,
    "chatRefId" TEXT NOT NULL,
    "assignedTo" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppAssignmentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification"."WhatsAppParticipant" (
    "id" TEXT NOT NULL,
    "chatRefId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "template_tenant_id_key_channel_key" ON "notification"."template"("tenant_id", "key", "channel");

-- CreateIndex
CREATE INDEX "template_version_templateId_locale_isActive_idx" ON "notification"."template_version"("templateId", "locale", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "template_version_templateId_locale_version_key" ON "notification"."template_version"("templateId", "locale", "version");

-- CreateIndex
CREATE INDEX "notification_status_created_at_idx" ON "notification"."notification"("status", "created_at");

-- CreateIndex
CREATE INDEX "notification_tenantId_status_idx" ON "notification"."notification"("tenantId", "status");

-- CreateIndex
CREATE INDEX "notification_recipient_username_created_at_idx" ON "notification"."notification"("recipient_username", "created_at");

-- CreateIndex
CREATE INDEX "notification_expiresAt_idx" ON "notification"."notification"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppChat_chatId_key" ON "notification"."WhatsAppChat"("chatId");

-- CreateIndex
CREATE INDEX "WhatsAppChat_assignedTo_idx" ON "notification"."WhatsAppChat"("assignedTo");

-- CreateIndex
CREATE INDEX "WhatsAppChat_status_idx" ON "notification"."WhatsAppChat"("status");

-- CreateIndex
CREATE INDEX "WhatsAppChat_updatedAt_idx" ON "notification"."WhatsAppChat"("updatedAt");

-- CreateIndex
CREATE INDEX "WhatsAppChat_assignedTo_status_idx" ON "notification"."WhatsAppChat"("assignedTo", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppMessage_messageId_key" ON "notification"."WhatsAppMessage"("messageId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_chatRefId_idx" ON "notification"."WhatsAppMessage"("chatRefId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_chatId_idx" ON "notification"."WhatsAppMessage"("chatId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_createdAt_idx" ON "notification"."WhatsAppMessage"("createdAt");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_status_idx" ON "notification"."WhatsAppMessage"("status");

-- CreateIndex
CREATE INDEX "WhatsAppAssignmentHistory_chatRefId_idx" ON "notification"."WhatsAppAssignmentHistory"("chatRefId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppParticipant_chatRefId_phone_key" ON "notification"."WhatsAppParticipant"("chatRefId", "phone");

-- AddForeignKey
ALTER TABLE "notification"."template" ADD CONSTRAINT "template_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "notification"."tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification"."template_version" ADD CONSTRAINT "template_version_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "notification"."template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification"."notification" ADD CONSTRAINT "notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "notification"."tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification"."notification" ADD CONSTRAINT "notification_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "notification"."template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification"."WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_chatRefId_fkey" FOREIGN KEY ("chatRefId") REFERENCES "notification"."WhatsAppChat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification"."WhatsAppAssignmentHistory" ADD CONSTRAINT "WhatsAppAssignmentHistory_chatRefId_fkey" FOREIGN KEY ("chatRefId") REFERENCES "notification"."WhatsAppChat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification"."WhatsAppParticipant" ADD CONSTRAINT "WhatsAppParticipant_chatRefId_fkey" FOREIGN KEY ("chatRefId") REFERENCES "notification"."WhatsAppChat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
