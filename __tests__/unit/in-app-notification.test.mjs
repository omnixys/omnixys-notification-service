import { Channel } from '../../dist/modules/notification/models/enums/channel.enum.js';
import { NotificationWriteService } from '../../dist/modules/notification/services/notification-write.service.js';
import assert from 'node:assert/strict';
import test from 'node:test';

test('in-app notification is persisted, delivered and published to its recipient', async () => {
  let stored;
  let published;
  const prisma = {
    notification: {
      async create({ data }) {
        stored = {
          id: 'notification-in-app-1',
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return stored;
      },
      async update({ data }) {
        stored = { ...stored, ...data };
        return stored;
      },
      async findUnique() {
        return stored;
      },
    },
    async $transaction(callback) {
      return callback(this);
    },
  };
  const facts = [];
  const service = new NotificationWriteService(
    prisma,
    {},
    { async dispatch() { throw new Error('external dispatch is not allowed'); } },
    {
      async renderFromId() {
        return {
          templateId: 'template-1',
          version: 3,
          renderedTitle: 'Live title',
          renderedBody: 'Live body',
        };
      },
    },
    {},
    {
      async publish(topic, payload) {
        published = { topic, payload };
      },
    },
    {
      log() {
        return { debug() {}, info() {}, warn() {}, error() {} };
      },
    },
    {
      async enqueue(_tx, topic, fact) {
        facts.push({ topic, fact });
      },
    },
  );

  const result = await service.createAndDispatch({
    recipientUsername: 'user-1',
    recipientId: 'user-1',
    channel: Channel.IN_APP,
    templateId: 'template-1',
  });

  assert.equal(result.status, 'DELIVERED');
  assert.equal(result.title, 'Live title');
  assert.equal(result.body, 'Live body');
  assert.equal(result.contentFormat, 'TEXT');
  assert.equal(result.templateVersion, 3);
  assert.ok(result.deliveredAt instanceof Date);
  assert.equal(published.topic, 'notification.user.user-1');
  assert.equal(facts[0].topic, 'notification.delivered.v1');
  assert.equal(
    published.payload.notificationReceived.id,
    'notification-in-app-1',
  );
});
