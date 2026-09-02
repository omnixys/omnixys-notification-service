-- notification: user/tenant reference columns store UUIDv7 identity values (U), align UUID types.
-- Values are (re)seeded as UUIDs after the UUIDv7 migration, plain casts are safe.
-- Existing indexes on these columns are rebuilt automatically by PostgreSQL.
ALTER TABLE "template"
    ALTER COLUMN "tenant_id" TYPE UUID USING "tenant_id"::uuid;

ALTER TABLE "notification"
    ALTER COLUMN "tenant_id" TYPE UUID USING "tenant_id"::uuid,
    ALTER COLUMN "recipient_id" TYPE UUID USING "recipient_id"::uuid,
    ALTER COLUMN "created_by" TYPE UUID USING "created_by"::uuid;

ALTER TABLE "support_conversation"
    ALTER COLUMN "guest_user_id" TYPE UUID USING "guest_user_id"::uuid;

ALTER TABLE "support_message"
    ALTER COLUMN "from_user_id" TYPE UUID USING "from_user_id"::uuid;

ALTER TABLE "support_assignment_history"
    ALTER COLUMN "assigned_by" TYPE UUID USING "assigned_by"::uuid;

ALTER TABLE "internal_message"
    ALTER COLUMN "sender_id" TYPE UUID USING "sender_id"::uuid;

ALTER TABLE "internal_participant"
    ALTER COLUMN "user_id" TYPE UUID USING "user_id"::uuid;