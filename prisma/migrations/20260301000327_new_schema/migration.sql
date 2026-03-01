/*
  Warnings:

  - You are about to drop the column `archived_at` on the `notification` table. All the data in the column will be lost.
  - You are about to drop the column `data` on the `notification` table. All the data in the column will be lost.
  - You are about to drop the column `dedupe_key` on the `notification` table. All the data in the column will be lost.
  - You are about to drop the column `delivered_at` on the `notification` table. All the data in the column will be lost.
  - You are about to drop the column `error_reason` on the `notification` table. All the data in the column will be lost.
  - You are about to drop the column `expires_at` on the `notification` table. All the data in the column will be lost.
  - You are about to drop the column `link_url` on the `notification` table. All the data in the column will be lost.
  - You are about to drop the column `read` on the `notification` table. All the data in the column will be lost.
  - You are about to drop the column `read_at` on the `notification` table. All the data in the column will be lost.
  - You are about to drop the column `recipient_tenant` on the `notification` table. All the data in the column will be lost.
  - You are about to drop the column `rendered_body` on the `notification` table. All the data in the column will be lost.
  - You are about to drop the column `rendered_title` on the `notification` table. All the data in the column will be lost.
  - You are about to drop the column `body` on the `template` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `template` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `template` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `template` table. All the data in the column will be lost.
  - You are about to drop the column `locale` on the `template` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `template` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `template` table. All the data in the column will be lost.
  - You are about to drop the column `variables` on the `template` table. All the data in the column will be lost.
  - You are about to drop the column `version` on the `template` table. All the data in the column will be lost.
  - You are about to drop the `delivery_attempt` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[tenant_id,key,channel]` on the table `template` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `template` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "content_format" AS ENUM ('TEXT', 'HTML', 'MARKDOWN');

-- CreateEnum
CREATE TYPE "WebhookEventType" AS ENUM ('DELIVERED', 'BOUNCED', 'OPENED', 'CLICKED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "notification_status" ADD VALUE 'DELIVERED';
ALTER TYPE "notification_status" ADD VALUE 'CANCELLED';

-- DropForeignKey
ALTER TABLE "delivery_attempt" DROP CONSTRAINT "delivery_attempt_notification_id_fkey";

-- DropIndex
DROP INDEX "notification_dedupe_key_key";

-- DropIndex
DROP INDEX "notification_expires_at_idx";

-- DropIndex
DROP INDEX "notification_recipient_username_read_created_at_idx";

-- DropIndex
DROP INDEX "notification_recipient_username_status_created_at_idx";

-- DropIndex
DROP INDEX "notification_template_id_idx";

-- DropIndex
DROP INDEX "template_key_channel_locale_version_key";

-- AlterTable
ALTER TABLE "notification" DROP COLUMN "archived_at",
DROP COLUMN "data",
DROP COLUMN "dedupe_key",
DROP COLUMN "delivered_at",
DROP COLUMN "error_reason",
DROP COLUMN "expires_at",
DROP COLUMN "link_url",
DROP COLUMN "read",
DROP COLUMN "read_at",
DROP COLUMN "recipient_tenant",
DROP COLUMN "rendered_body",
DROP COLUMN "rendered_title",
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "metadata" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "provider" TEXT,
ADD COLUMN     "providerRef" TEXT,
ADD COLUMN     "purgedAt" TIMESTAMP(3),
ADD COLUMN     "readAt" TIMESTAMP(3),
ADD COLUMN     "recipient_address" TEXT,
ADD COLUMN     "templateVersion" INTEGER,
ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "template" DROP COLUMN "body",
DROP COLUMN "category",
DROP COLUMN "created_at",
DROP COLUMN "is_active",
DROP COLUMN "locale",
DROP COLUMN "title",
DROP COLUMN "updated_at",
DROP COLUMN "variables",
DROP COLUMN "version",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "tenant_id" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- DropTable
DROP TABLE "delivery_attempt";

-- DropEnum
DROP TYPE "category";

-- CreateTable
CREATE TABLE "tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "template_tenant_id_key_channel_key" ON "template"("tenant_id", "key", "channel");

-- AddForeignKey
ALTER TABLE "template" ADD CONSTRAINT "template_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_version" ADD CONSTRAINT "template_version_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
