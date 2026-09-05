/**
 * @license GPL-3.0-or-later
 * Copyright (C) 2025 Caleb Gyamfi - Omnixys Technologies
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 *
 * For more information, visit <https://www.gnu.org/licenses/>.
 */

import { Injectable } from '@nestjs/common';
import { ValkeyKey, ValkeyService } from '@omnixys/cache-ts';
import { FrameworkException, guestAuthKeySchema } from '@omnixys/contracts-ts';
import {
  CreatePendingUserDTO,
  GuestNotificationDTO,
} from '@omnixys/contracts-ts';

import { NotificationInputException } from '../modules/notification/errors/notification.error.js';
import { NotificationWriteService } from '../modules/notification/services/notification-write.service.js';
import {
  IKafkaEventContext,
  KAFKA_HEADERS,
  KafkaEvent,
  KafkaEventHandler,
  KafkaTopics,
} from '@omnixys/kafka-ts';
import { OmnixysLogger } from '@omnixys/logger-ts';
import { TraceRunner } from '@omnixys/observability-ts';

const PERMANENT_ERROR_CODES = new Set([
  'NOTIFICATION_INPUT_INVALID',
  'NOTIFICATION_STATE_INVALID',
  'NOTIFICATION_CHANNEL_UNAVAILABLE',
  'NOTIFICATION_NOT_FOUND',
  'MESSAGE_INPUT_INVALID',
  'TEMPLATE_NOT_FOUND',
]);

@KafkaEventHandler('invitation')
@Injectable()
export class InvitationHandler {
  private readonly logger;

  constructor(
    loggerService: OmnixysLogger,
    private readonly service: NotificationWriteService,
    private readonly cache: ValkeyService,
  ) {
    this.logger = loggerService.log(
      this.constructor.name,
    );
  }

  @KafkaEvent(KafkaTopics.notification.confirmGuest)
  async handleAddGuestId(
    payload: GuestNotificationDTO,
    context: IKafkaEventContext,
  ): Promise<void> {
    return TraceRunner.run('[HANDLER] confirmGuest', async () => {
      const { token, eventName, seat, seatId, eventEndsAt } = payload;

      const headers = context.headers;
      const actorId = headers[KAFKA_HEADERS.ACTOR_ID];
      if (!actorId) {
        this.logger.error(
          'Missing ACTOR_ID header in confirmGuest event - fail closed',
        );
        return;
      }

      this.logger.debug(
        'confirmGuest message received: eventName=%s actorId=%s',
        eventName,
        actorId,
      );

      const raw = await this.cache.get(ValkeyKey.pendingContact, token);

      if (!raw) {
        this.logger.warn(
          'confirmGuest skipped: pending contact not found (already processed or expired) token=%s',
          token,
        );
        return;
      }

      const idempotencyKey = `notification:confirmGuest:${token}`;
      const alreadyProcessing = await this.cache.rawGet(idempotencyKey);
      if (alreadyProcessing) {
        this.logger.warn(
          'confirmGuest skipped: already being processed token=%s',
          token,
        );
        return;
      }

      try {
        const input = JSON.parse(raw) as CreatePendingUserDTO;
        const tenant = guestAuthKeySchema.shape.tenantId.safeParse(
          headers[KAFKA_HEADERS.TENANT_ID],
        );
        if (!tenant.success) {
          throw new NotificationInputException('verified-tenant-required');
        }
        if (input.tenantId !== undefined && input.tenantId !== tenant.data) {
          throw new NotificationInputException('tenant-context-mismatch');
        }

        const finalInput: CreatePendingUserDTO = {
          ...input,
          seatId,
          actorId,
          tenantId: tenant.data,
          eventEndsAt,
        };

        await this.cache.rawSet(idempotencyKey, '1', 900);
        this.logger.debug(
          'confirmGuest notification processing started: eventName=%s',
          eventName,
        );
        await this.service.confirmGuest({
          input: finalInput,
          eventName,
          seat,
          eventEndsAt,
        });
        this.logger.debug(
          'confirmGuest notification processing completed: eventName=%s',
          eventName,
        );

        this.logger.debug(
          'confirmGuest pending contact deletion started: eventName=%s',
          eventName,
        );
        await this.cache.delete(ValkeyKey.pendingContact, token);
        this.logger.info(
          'confirmGuest processing completed: eventName=%s actorId=%s',
          eventName,
          actorId,
        );
      } catch (e: unknown) {
        this.logger.error(
          'confirmGuest processing failed: eventName=%s actorId=%s error=%s',
          eventName,
          actorId,
          e instanceof Error ? e.message : String(e),
        );

        const errorCode = e instanceof FrameworkException ? e.code : undefined;

        if (errorCode && PERMANENT_ERROR_CODES.has(errorCode)) {
          this.logger.warn(
            'confirmGuest permanent error classified, not retrying: eventName=%s code=%s',
            eventName,
            errorCode,
          );
          return;
        }

        await this.cache.client.del(this.cache.key(idempotencyKey));
        throw e;
      }
    });
  }
}
