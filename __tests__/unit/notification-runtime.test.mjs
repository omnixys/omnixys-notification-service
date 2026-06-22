import {
  ChatAccessDeniedException,
  NotificationDeliveryException,
  NotificationInputException,
  NotificationNotFoundException,
  NotificationStateException,
  TemplateAlreadyExistsException,
} from '../../dist/modules/notification/errors/notification.error.js';
import { WhatsAppService } from '../../dist/modules/messages/services/whatsapp.service.js';
import { ContextAccessor } from '@omnixys/context';
import assert from 'node:assert/strict';
import test from 'node:test';

test('notification errors preserve canonical request metadata', () => {
  ContextAccessor.run(
    {
      requestId: 'request-notification',
      correlationId: 'correlation-notification',
      actorId: 'actor-notification',
      tenantId: 'tenant-notification',
    },
    () => {
      const error = new NotificationNotFoundException('notification-1');
      assert.equal(error.code, 'NOTIFICATION_NOT_FOUND');
      assert.equal(error.requestId, 'request-notification');
      assert.equal(error.correlationId, 'correlation-notification');
      assert.equal(error.actorId, 'actor-notification');
      assert.equal(error.tenantId, 'tenant-notification');
    },
  );
});

test('invalid delivery state uses a structured error', () => {
  const error = new NotificationStateException('pending-contact-expired');
  assert.equal(error.code, 'NOTIFICATION_STATE_INVALID');
  assert.deepEqual(error.metadata, { reason: 'pending-contact-expired' });
});

test('notification subdomains use stable machine-readable codes', () => {
  assert.equal(
    new NotificationInputException('recipient-channel-missing').code,
    'NOTIFICATION_INPUT_INVALID',
  );
  assert.equal(
    new TemplateAlreadyExistsException({ key: 'invite' }).code,
    'TEMPLATE_ALREADY_EXISTS',
  );
  assert.equal(
    new ChatAccessDeniedException('chat-1').code,
    'CHAT_ACCESS_DENIED',
  );
});

test('WhatsApp provider failures are normalized without replacing structured errors', async () => {
  const cause = new Error('provider secret');
  const service = new WhatsAppService({
    async send() {
      throw cause;
    },
  });

  await assert.rejects(service.send({ to: '+49123', message: 'hello' }), (error) => {
    assert.ok(error instanceof NotificationDeliveryException);
    assert.equal(error.code, 'NOTIFICATION_DELIVERY_FAILED');
    assert.equal(error.cause, cause);
    return true;
  });

  const structured = new NotificationInputException('phone-number-invalid');
  const passthrough = new WhatsAppService({
    async send() {
      throw structured;
    },
  });
  await assert.rejects(passthrough.send({ to: '', message: 'hello' }), (error) => error === structured);
});
