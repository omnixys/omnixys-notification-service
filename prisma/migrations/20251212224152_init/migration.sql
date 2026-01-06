-- CreateEnum
CREATE TYPE "channel" AS ENUM ('IN_APP', 'PUSH', 'EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "notification_status" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "delivery_attempt_status" AS ENUM ('SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "category" AS ENUM ('WHATSAPP', 'INFO', 'WARNING');

-- CreateTable
CREATE TABLE "template" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "variables" JSONB NOT NULL DEFAULT '{}',
    "locale" TEXT NOT NULL DEFAULT 'de-DE',
    "channel" "channel" NOT NULL,
    "category" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "recipient_username" TEXT NOT NULL,
    "recipient_id" TEXT,
    "recipient_tenant" TEXT,
    "template_id" TEXT,
    "variables" JSONB NOT NULL DEFAULT '{}',
    "rendered_title" TEXT,
    "rendered_body" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "link_url" TEXT,
    "channel" "channel" NOT NULL,
    "priority" "priority" NOT NULL DEFAULT 'NORMAL',
    "category" TEXT,
    "status" "notification_status" NOT NULL DEFAULT 'PENDING',
    "error_reason" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "sensitive" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "dedupe_key" TEXT,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_attempt" (
    "id" TEXT NOT NULL,
    "notification_id" TEXT NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "delivery_attempt_status" NOT NULL,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_attempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "template_key_channel_locale_version_key" ON "template"("key", "channel", "locale", "version");

-- CreateIndex
CREATE UNIQUE INDEX "notification_dedupe_key_key" ON "notification"("dedupe_key");

-- CreateIndex
CREATE INDEX "notification_recipient_username_read_created_at_idx" ON "notification"("recipient_username", "read", "created_at");

-- CreateIndex
CREATE INDEX "notification_recipient_username_status_created_at_idx" ON "notification"("recipient_username", "status", "created_at");

-- CreateIndex
CREATE INDEX "notification_template_id_idx" ON "notification"("template_id");

-- CreateIndex
CREATE INDEX "notification_expires_at_idx" ON "notification"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_attempt_notification_id_attempt_number_key" ON "delivery_attempt"("notification_id", "attempt_number");

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_attempt" ADD CONSTRAINT "delivery_attempt_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
