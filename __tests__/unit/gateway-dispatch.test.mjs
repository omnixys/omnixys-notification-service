import assert from 'node:assert/strict';
import test from 'node:test';

import { DispatchService } from '../../dist/modules/messages/services/dispatch.service.js';

const logger = {
  log() {
    return { debug() {}, info() {}, warn() {}, error() {} };
  },
};

test('dispatch forwards the V1 email contract including address and subject', async () => {
  let received;
  const service = new DispatchService({
    async send(input) {
      received = input;
      return { success: true, status: 'SENT', providerMessageId: 'resend-1' };
    },
  }, logger);
  const result = await service.dispatch({
    id: 'notification-1',
    channel: 'EMAIL',
    recipientAddress: 'person@example.com',
    body: '<p>Hello</p>',
    contentType: 'HTML',
    subject: 'Welcome',
    senderAddress: 'Omnixys <no-reply@omnixys.com>',
  });
  assert.equal(result.success, true);
  assert.equal(result.providerMessageId, 'resend-1');
  assert.equal(received.recipientAddress, 'person@example.com');
  assert.equal(received.subject, 'Welcome');
  assert.equal(received.contentType, 'HTML');
});

test('dispatch preserves gateway failure without provider details', async () => {
  const service = new DispatchService({
    async send() {
      return { success: false, status: 'FAILED', error: 'RESEND_TIMEOUT' };
    },
  }, logger);
  const result = await service.dispatch({
    id: 'notification-2',
    channel: 'EMAIL',
    recipientAddress: 'person@example.com',
    body: 'Hello',
  });
  assert.deepEqual(result, {
    success: false,
    status: 'FAILED',
    error: 'RESEND_TIMEOUT',
  });
});
