import {
  ChatAccessDeniedException,
  NotificationDeliveryException,
  NotificationInputException,
  NotificationNotFoundException,
  NotificationStateException,
  TemplateAlreadyExistsException,
} from '../../dist/modules/notification/errors/notification.error.js';
import { NotificationMutationResolver } from '../../dist/modules/notification/resolver/notification-mutation.resolver.js';
import { NotificationModule } from '../../dist/modules/notification/notification.module.js';
import { NotificationCacheService } from '../../dist/modules/notification/services/notification-cache.service.js';
import { InvitationHandler } from '../../dist/handlers/invitation.handler.js';
import { NotificationEventRoleResolver } from '../../dist/modules/support/common/event-role-resolver.service.js';
import { SupportCommonModule } from '../../dist/modules/support/common/support-common.module.js';
import { GatewayClientService } from '../../dist/modules/messages/services/gateway-client.service.js';
import { MODULE_METADATA } from '@nestjs/common/constants.js';
import { EventPermissionKey, guestAuthKeySchema } from '@omnixys/contracts-ts';
import { ContextAccessor } from '@omnixys/context-ts';
import axios from 'axios';
import assert from 'node:assert/strict';
import test, { mock } from 'node:test';

const logger = {
  log() {
    return { debug() {}, info() {}, warn() {}, error() {} };
  },
};

test('gateway client preserves the safe provider failure code', async () => {
  mock.method(axios, 'post', async () => {
    throw new axios.AxiosError(
      'Request failed with status code 502',
      'ERR_BAD_RESPONSE',
      undefined,
      undefined,
      {
        status: 502,
        statusText: 'Bad Gateway',
        headers: {},
        config: { headers: {} },
        data: { detail: { code: 'RESEND_AUTH_FAILED' } },
      },
    );
  });

  const result = await new GatewayClientService(logger).send({
    id: 'notification-3',
    channel: 'EMAIL',
    recipientAddress: 'person@example.com',
    body: 'Hello',
  });

  assert.deepEqual(result, {
    success: false,
    status: 'FAILED',
    error: 'RESEND_AUTH_FAILED',
  });
  mock.restoreAll();
});

test('gateway client uses a generic code for malformed gateway failures', async () => {
  mock.method(axios, 'post', async () => {
    throw new axios.AxiosError(
      'Request failed with status code 502',
      'ERR_BAD_RESPONSE',
      undefined,
      undefined,
      {
        status: 502,
        statusText: 'Bad Gateway',
        headers: {},
        config: { headers: {} },
        data: { detail: {} },
      },
    );
  });

  const result = await new GatewayClientService(logger).send({
    id: 'notification-4',
    channel: 'EMAIL',
    recipientAddress: 'person@example.com',
    body: 'Hello',
  });

  assert.equal(result.error, 'GATEWAY_ERROR');
  mock.restoreAll();
});

test('notification module imports its event permission provider', () => {
  const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, NotificationModule) ?? [];
  assert.ok(imports.includes(SupportCommonModule));
});

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
  assert.deepEqual(error.metadata, {});
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

test('guest verification cache omits null optional emails', async () => {
  const storedPayloads = new Map();
  let keyCounter = 0;
  const cache = {
    async set(key, value) {
      storedPayloads.set(key.prefix, value);
      keyCounter += 1;
      return `${key.prefix}:${keyCounter}`;
    },
  };
  const service = new NotificationCacheService(
    {
      log() {
        return { debug() {}, info() {}, warn() {}, error() {} };
      },
    },
    cache,
  );

  await service.storeGuestVerificationPayload({
    actorId: '00000000-0000-4000-8000-000000000001',
    tenantId: '00000000-0000-4000-8000-000000000005',
    eventId: '00000000-0000-4000-8000-000000000002',
    invitationId: '00000000-0000-4000-8000-000000000003',
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: null,
    locale: 'en-US',
    eventEndsAt: new Date('2030-01-01T12:00:00.000Z'),
    plusOnes: [
      {
        invitationId: '00000000-0000-4000-8000-000000000004',
        firstName: 'Grace',
        lastName: 'Hopper',
        email: null,
      },
    ],
  });

  const authPayload = JSON.parse(storedPayloads.get('verification:guest:auth'));
  const userPayload = JSON.parse(storedPayloads.get('verification:guest:user'));

  assert.doesNotThrow(() => guestAuthKeySchema.parse(authPayload));
  assert.equal(authPayload.tenantId, '00000000-0000-4000-8000-000000000005');
  assert.equal(Object.hasOwn(authPayload.invitees[0], 'email'), false);
  assert.equal(Object.hasOwn(authPayload.invitees[1], 'email'), false);
  assert.equal(Object.hasOwn(userPayload.users[0], 'email'), false);
  assert.equal(Object.hasOwn(userPayload.users[1], 'email'), false);
});

test('guest verification cache rejects a missing verified tenant', async () => {
  const service = new NotificationCacheService(logger, {
    async set() {
      throw new Error('cache must not be written');
    },
  });

  await assert.rejects(
    service.storeGuestVerificationPayload({
      actorId: '00000000-0000-4000-8000-000000000001',
      eventId: '00000000-0000-4000-8000-000000000002',
      invitationId: '00000000-0000-4000-8000-000000000003',
      firstName: 'Ada',
      lastName: 'Lovelace',
      locale: 'en-US',
      eventEndsAt: new Date('2030-01-01T12:00:00.000Z'),
    }),
    (error) =>
      error instanceof NotificationInputException &&
      error.code === 'NOTIFICATION_INPUT_INVALID',
  );
});

test('confirm guest uses the verified Kafka tenant and rejects mismatches', async () => {
  let receivedInput;
  const pending = JSON.stringify({
    actorId: '00000000-0000-4000-8000-000000000001',
    tenantId: '00000000-0000-4000-8000-000000000009',
    eventId: '00000000-0000-4000-8000-000000000002',
    invitationId: '00000000-0000-4000-8000-000000000003',
    firstName: 'Ada',
    lastName: 'Lovelace',
    locale: 'en-US',
    eventEndsAt: '2030-01-01T12:00:00.000Z',
  });
  const cache = {
    async get() {
      return pending;
    },
    async rawGet() {
      return null;
    },
    async rawSet() {},
    async delete() {},
    key(value) {
      return value;
    },
    client: {
      async del() {},
    },
  };
  const handler = new InvitationHandler(
    logger,
    {
      async confirmGuest({ input }) {
        receivedInput = input;
      },
    },
    cache,
  );
  const payload = {
    token: 'token',
    eventName: 'Launch',
    eventEndsAt: new Date('2030-01-01T12:00:00.000Z'),
  };
  const matchingContext = {
    headers: {
      'x-meta-actorId': '00000000-0000-4000-8000-000000000001',
      'x-meta-tenantId': '00000000-0000-4000-8000-000000000009',
    },
  };
  const mismatchingContext = {
    headers: {
      'x-meta-actorId': '00000000-0000-4000-8000-000000000001',
      'x-meta-tenantId': '00000000-0000-4000-8000-000000000005',
    },
  };

  await assert.doesNotReject(handler.handleAddGuestId(payload, matchingContext));
  assert.equal(receivedInput.tenantId, '00000000-0000-4000-8000-000000000009');

  receivedInput = undefined;
  await assert.doesNotReject(handler.handleAddGuestId(payload, mismatchingContext));
  assert.equal(receivedInput, undefined);
});

test('notification event permission resolver reads effective access projection', async () => {
  const resolver = new NotificationEventRoleResolver({
    eventAccessProjection: {
      async findUnique() {
        return {
          permissions: [EventPermissionKey.SendNotifications, 'unknown.permission'],
        };
      },
    },
  });

  assert.deepEqual(await resolver.getPermissionsForUser('user-1', 'event-1'), [
    EventPermissionKey.SendNotifications,
  ]);
});

test('notification event permission resolver treats missing projection as no access', async () => {
  const resolver = new NotificationEventRoleResolver({
    eventAccessProjection: {
      async findUnique() {
        return null;
      },
    },
  });

  assert.deepEqual(await resolver.getPermissionsForUser('user-1', 'event-1'), []);
});

test('sendInvitations requires notifications.send on every distinct guest event', async () => {
  let sent = false;
  const checkedEvents = [];
  const resolver = new NotificationMutationResolver(
    {
      log() {
        return { debug() {}, info() {}, warn() {}, error() {} };
      },
    },
    {
      async sendBulkInvitations() {
        sent = true;
      },
    },
    {
      async getPermissionsForUser(_userId, eventId) {
        checkedEvents.push(eventId);
        return eventId === 'event-a' ? [EventPermissionKey.SendNotifications] : [];
      },
    },
  );

  await assert.rejects(
    resolver.sendInvitations(
      {
        guests: [
          {
            firstName: 'Ada',
            lastName: 'Lovelace',
            eventId: 'event-a',
            eventName: 'A',
            rsvpUrl: 'https://event-a.test',
          },
          {
            firstName: 'Grace',
            lastName: 'Hopper',
            eventId: 'event-b',
            eventName: 'B',
            rsvpUrl: 'https://event-b.test',
          },
        ],
      },
      { id: 'user-1' },
    ),
    (error) => {
      assert.equal(error.code, 'EVENT_ACCESS_DENIED');
      return true;
    },
  );

  assert.deepEqual(new Set(checkedEvents), new Set(['event-a', 'event-b']));
  assert.equal(sent, false);
});
