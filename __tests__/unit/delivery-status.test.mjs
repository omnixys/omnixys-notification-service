import { DeliveryStatusHandler } from '../../dist/handlers/delivery-status.handler.js';
import assert from 'node:assert/strict';
import test from 'node:test';

function createHandler(notification) {
  const updates = [];
  const facts = [];
  const transactionClient = {
    notification: {
      async update(input) {
        updates.push(input);
      },
    },
  };
  const prisma = {
    notification: {
      async findUnique() {
        return notification;
      },
    },
    messageDelivery: {
      async findUnique() {
        return null;
      },
    },
    async $transaction(callback) {
      return callback(transactionClient);
    },
  };
  const logger = {
    log() {
      return { debug() {}, info() {}, warn() {}, error() {} };
    },
  };
  const analyticsOutbox = {
    async enqueue(_tx, topic, fact) {
      facts.push({ topic, fact });
    },
  };
  return {
    handler: new DeliveryStatusHandler(prisma, logger, analyticsOutbox),
    updates,
    facts,
  };
}

test('notification delivery follows SENT to DELIVERED to READ', async () => {
  const delivered = createHandler({
    id: 'notification-1',
    status: 'SENT',
    providerRef: null,
    deliveredAt: null,
    readAt: null,
  });
  await delivered.handler.handleDeliveryStatus({
    messageId: 'notification-1',
    providerMessageId: 'provider-1',
    status: 'DELIVERED',
  });
  assert.equal(delivered.updates.length, 1);
  assert.equal(delivered.updates[0].data.status, 'DELIVERED');
  assert.ok(delivered.updates[0].data.deliveredAt instanceof Date);
  assert.equal(delivered.facts[0].topic, 'notification.delivered.v1');

  const deliveredAt = new Date('2026-07-13T12:00:00.000Z');
  const read = createHandler({
    id: 'notification-1',
    status: 'DELIVERED',
    providerRef: 'provider-1',
    deliveredAt,
    readAt: null,
  });
  await read.handler.handleDeliveryStatus({
    messageId: 'notification-1',
    providerMessageId: 'provider-1',
    status: 'READ',
  });
  assert.equal(read.updates.length, 1);
  assert.equal(read.updates[0].data.status, 'DELIVERED');
  assert.equal(read.updates[0].data.deliveredAt, deliveredAt);
  assert.ok(read.updates[0].data.readAt instanceof Date);
});

test('notification delivery rejects a skipped transition', async () => {
  const result = createHandler({
    id: 'notification-2',
    status: 'SENT',
    providerRef: null,
    deliveredAt: null,
    readAt: null,
  });
  await result.handler.handleDeliveryStatus({
    messageId: 'notification-2',
    providerMessageId: 'provider-2',
    status: 'READ',
  });
  assert.equal(result.updates.length, 0);
});
