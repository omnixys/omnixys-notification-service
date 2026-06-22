# Omnixys Notification Service

The Notification service owns notification records, versioned templates, outbound mail and WhatsApp delivery, and operator conversation state. It consumes domain events from Kafka and exposes guarded GraphQL APIs for users and operators.

## Runtime architecture

- PostgreSQL and Prisma store notifications, templates, WhatsApp chats, messages, participants, and assignment history.
- Kafka delivers authentication, event, invitation, and WhatsApp lifecycle events.
- Valkey provides registration state, streams, pub/sub, and distributed assignment locks.
- `@omnixys/context` owns request, actor, tenant, request ID, correlation ID, and trace metadata.
- `@omnixys/logger` and `@omnixys/observability` enrich logs, spans, and metrics from the same context.
- Resend and the configured WhatsApp provider own external delivery transport.

Generic notification and template administration requires the `ADMIN` business role. User conversation operations require a verified principal. Debug and WhatsApp QR/state APIs are administrative.

## Configuration

Create `.env` from `.env.example`. Production requires database, Valkey, Keycloak, encryption, cookie, Resend, and provider credentials. `CHROME_PATH` is required only for the WhatsApp Web provider.

## Health and lifecycle

- `GET /health/liveness` reports process liveness.
- `GET /health/readiness` checks PostgreSQL, Valkey, Kafka lifecycle state, and configured external endpoints.
- Nest shutdown hooks close Prisma, Kafka, Valkey, delivery providers, logger batches, and observability exporters.

## Development

```bash
pnpm install
pnpm run generate
pnpm run build
pnpm run lint
pnpm run test:unit
pnpm run test:integration
pnpm run test:e2e
```

The resolver E2E suite validates notification, template, chat, message, provider, and authorization-facing contracts without contacting real delivery providers.
