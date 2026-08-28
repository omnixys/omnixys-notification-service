ALTER TABLE "support_conversation"
ADD COLUMN "guest_unread_count" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "uq_support_open_guest_event"
ON "support_conversation" ("event_id", "guest_user_id")
WHERE "guest_user_id" IS NOT NULL
  AND "deleted_at" IS NULL
  AND "status" <> 'CLOSED';

CREATE UNIQUE INDEX "uq_support_open_invitation_event"
ON "support_conversation" ("event_id", "invitation_id")
WHERE "invitation_id" IS NOT NULL
  AND "deleted_at" IS NULL
  AND "status" <> 'CLOSED';
