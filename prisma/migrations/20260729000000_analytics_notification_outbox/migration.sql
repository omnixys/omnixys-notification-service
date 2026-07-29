ALTER TABLE "outbox_message"
  ADD COLUMN "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "locked_at" TIMESTAMP(3),
  ADD COLUMN "locked_by" TEXT,
  ADD COLUMN "dead_lettered_at" TIMESTAMP(3);

DROP INDEX IF EXISTS "outbox_message_status_created_at_idx";
CREATE INDEX "outbox_message_status_next_attempt_at_created_at_idx"
  ON "outbox_message"("status", "next_attempt_at", "created_at");
