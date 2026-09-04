import assert from 'node:assert/strict';
import test from 'node:test';

const UUIDV7_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const TEST_SENDER_ID = '018f0000-0000-7000-8000-0000000000aa';

function stubLogger() {
  return {
    log() {
      return { debug() {}, info() {}, warn() {}, error() {} };
    },
  };
}

async function buildService() {
  process.env.FROM_SENDER_ID = TEST_SENDER_ID;

  const { NotificationWriteService } = await import(
    '../../dist/modules/notification/services/notification-write.service.js'
  );

  const dispatchedHolder = { value: undefined };
  const dispatchService = {
    async dispatch(input) {
      dispatchedHolder.value = input;
      return { success: true, status: 'SENT', providerMessageId: 'resend-1' };
    },
  };

  const notification = { id: '018f0000-0000-7000-8000-000000000001', status: 'PENDING' };
  const prisma = {
    notification: {
      create: async () => notification,
      update: async () => notification,
      findUnique: async () => notification,
    },
  };

  const service = new NotificationWriteService(
    prisma,
    {
      async storeSignupVerificationPayload() {
        return { signupId: 'token-1', username: 'test-customer' };
      },
    },
    dispatchService,
    {
      async renderFromKey() {
        return {
          templateId: '9b048cfb-4364-4de5-a7dd-80b55f72c368',
          renderedTitle: 'Verify your email',
          renderedBody: '<p>Verify</p>',
        };
      },
    },
    {
      encrypt() {
        return 'encrypted-token';
      },
    },
    {
      async publish() {},
    },
    stubLogger(),
    {
      async enqueue() {},
    },
  );

  return { service, dispatchedHolder };
}

test('EMAIL signup verification dispatch sends a UUIDv7 senderId and email senderAddress', async () => {
  const { service, dispatchedHolder } = await buildService();

  await service.createSignupVerification({
    createUserInput: {
      username: 'test-customer',
      password: 'secret',
      userType: 'CUSTOMER',
      personalInfo: {
        email: 'test@omnixys.de',
        firstName: 'Test',
        lastName: 'Test',
      },
      acceptedTerms: true,
    },
    locale: 'en-US',
  });

  const dispatched = dispatchedHolder.value;
  assert.ok(dispatched, 'dispatch must be called');
  assert.equal(dispatched.channel, 'EMAIL');
  assert.ok(
    UUIDV7_RE.test(dispatched.senderId),
    `senderId must be a UUIDv7, got ${dispatched.senderId}`,
  );
  assert.ok(
    /^Omnixys <[^>]+>$/.test(dispatched.senderAddress),
    `senderAddress must be the email "from", got ${dispatched.senderAddress}`,
  );
  assert.equal(dispatched.recipientAddress, 'test@omnixys.de');
});

test('EMAIL dispatch uses the configured FROM_SENDER_ID value, not the email address', async () => {
  const { service, dispatchedHolder } = await buildService();

  await service.createSignupVerification({
    createUserInput: {
      username: 'test-customer',
      password: 'secret',
      userType: 'CUSTOMER',
      personalInfo: {
        email: 'test@omnixys.de',
        firstName: 'Test',
        lastName: 'Test',
      },
      acceptedTerms: true,
    },
    locale: 'en-US',
  });

  const dispatched = dispatchedHolder.value;
  assert.ok(dispatched, 'dispatch must be called');
  assert.equal(dispatched.senderId, TEST_SENDER_ID);
  assert.equal(dispatched.senderAddress, 'Omnixys <no-reply@omnixys.com>');
});