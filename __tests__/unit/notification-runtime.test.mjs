import {
  NotificationNotFoundException,
  NotificationStateException,
} from '../../dist/modules/notification/errors/notification.error.js';
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
