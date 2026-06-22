import {
  NotificationNotFoundException,
  NotificationDeliveryException,
} from '../../dist/modules/notification/errors/notification.error.js';
import { toGraphQLError } from '@omnixys/graphql';
import { ContextAccessor } from '@omnixys/context';
import assert from 'node:assert/strict';
import test from 'node:test';

test('GraphQL maps notification failures with canonical identifiers', () => {
  ContextAccessor.run(
    { requestId: 'request-graphql', correlationId: 'correlation-graphql' },
    () => {
      const mapped = toGraphQLError(
        new NotificationNotFoundException('notification-1'),
      );
      assert.equal(mapped.extensions.code, 'NOTIFICATION_NOT_FOUND');
      assert.equal(mapped.extensions.requestId, 'request-graphql');
      assert.equal(mapped.extensions.correlationId, 'correlation-graphql');
    },
  );
});

test('GraphQL exposes safe delivery details without the provider cause', () => {
  const mapped = toGraphQLError(
    new NotificationDeliveryException('EMAIL', new Error('provider secret'), {
      notificationId: 'notification-1',
      accessToken: 'must-not-leak',
    }),
  );

  assert.equal(mapped.extensions.code, 'NOTIFICATION_DELIVERY_FAILED');
  assert.deepEqual(mapped.extensions.details, {
    channel: 'EMAIL',
    notificationId: 'notification-1',
  });
});
