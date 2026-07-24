# Notification Service V1

The Notification Service owns durable notification history and versioned
templates. Its public channels are `EMAIL`, `WHATSAPP` and `IN_APP`.

- Email and WhatsApp are dispatched only through the Communication Gateway.
- Resend and Evolution credentials do not belong in this service.
- In-app notifications are persisted, published immediately on the recipient's
  Valkey topic and remain available through `myNotifications`.
- Rendered title, body, format and template version are stored with the record.
- User read/archive operations derive the recipient from the authenticated
  principal; administration remains role-protected.
- Delivery events update the notification by its internal notification ID.
  `deliveredAt` is set only for `DELIVERED`.

Chat, support conversations, browser-based WhatsApp and direct provider code are
not started or exposed by the V1 Notification runtime. Legacy database tables are
left intact for a later destructive cleanup.

Production requires `GATEWAY_BASE_URL` and `GATEWAY_API_KEY` in addition to the
normal database, Valkey, Keycloak and encryption settings.

The gateway server protects its internal routes with `INTERNAL_API_KEY`.
Notification's `GATEWAY_API_KEY` (and other clients' respective gateway API-key
settings) must contain the same secret. Provider credentials such as
`RESEND_API_KEY` belong only to the Communication Gateway.
