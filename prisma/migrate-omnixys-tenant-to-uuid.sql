-- One-time migration: replace the legacy 'omnixys' tenant identifier with the
-- canonical UUID. Execute against the notification service database, e.g.:
--   psql "$DATABASE_URL" -f prisma/migrate-omnixys-tenant-to-uuid.sql
--
-- The `tenant` table has no foreign keys pointing to it; `template.tenant_id`
-- and `notification.tenant_id` are plain TEXT columns. The explicit SELECT
-- guards against a primary-key collision if the canonical UUID already exists.
--
-- NOTE: keep this file OUT of prisma/migrations/ on purpose — Prisma wraps each
-- migration in its own transaction, which conflicts with the explicit
-- BEGIN/COMMIT required here.

BEGIN;

SELECT 1 FROM tenant WHERE id = '6e788f7f-c233-4cb8-bbde-c0b855e564be';

UPDATE tenant
SET id = '6e788f7f-c233-4cb8-bbde-c0b855e564be'
WHERE id = 'omnixys';

UPDATE template
SET tenant_id = '6e788f7f-c233-4cb8-bbde-c0b855e564be'
WHERE tenant_id = 'omnixys';

UPDATE notification
SET tenant_id = '6e788f7f-c233-4cb8-bbde-c0b855e564be'
WHERE tenant_id = 'omnixys';

COMMIT;
