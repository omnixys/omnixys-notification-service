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

import { NotificationStateException } from '../modules/notification/errors/notification.error.js';
import { Injectable } from '@nestjs/common';
import { ValkeyKey, ValkeyService } from '@omnixys/cache';
import { CreatePendingUserDTO, GuestNotificationDTO } from '@omnixys/shared';

import { NotificationWriteService } from '../modules/notification/services/notification-write.service.js';
import {
  IKafkaEventContext,
  KAFKA_HEADERS,
  KafkaEvent,
  KafkaEventHandler,
  KafkaTopics,
} from '@omnixys/kafka';
import { OmnixysLogger } from '@omnixys/logger';
import { TraceRunner } from '@omnixys/observability';

/**
 * Kafka event handler responsible for useristrative commands such as
 * shutdown and restart. It listens for specific user-related topics
 * and delegates the actual process control logic to the {@link UserService}.
 *
 * @category Messaging
 * @since 1.0.0
 */
@KafkaEventHandler('invitation')
@Injectable()
export class InvitationHandler {
  private readonly logger;

  /**
   * Creates a new instance of {@link UserHandler}.
   *
   * @param loggerService - The central logger service used for structured logging.
   * @param userService - The service responsible for handling system-level user operations.
   */
  constructor(
    loggerService: OmnixysLogger,
    private readonly service: NotificationWriteService,
    private readonly cache: ValkeyService,
  ) {
    this.logger = loggerService.log(this.constructor.name);
  }

  @KafkaEvent(KafkaTopics.notification.confirmGuest)
  async handleAddGuestId(
    payload: GuestNotificationDTO,
    context: IKafkaEventContext,
  ): Promise<void> {
    return TraceRunner.run('[HANDLER] confirmGuest', async () => {
      const { token, eventName, seat, seatId, eventEndsAt } = payload;

      const headers = context.headers;
      const actorId = headers[KAFKA_HEADERS.ACTOR_ID] ?? 'Unkown';

      this.logger.debug(
        'confirmGuest message received: eventName=%s actorId=%s',
        eventName,
        actorId,
      );
      this.logger.debug(
        'confirmGuest processing started: eventName=%s seat=%s actorId=%s',
        eventName,
        seat,
        actorId,
      );

      this.logger.debug(
        'confirmGuest pending contact lookup started: eventName=%s',
        eventName,
      );
      const raw = await this.cache.get(ValkeyKey.pendingContact, token);

      this.logger.debug('confirmGuest pending contact found=%s', Boolean(raw));
      if (!raw) {
        this.logger.warn(
          'confirmGuest message ignored: pending contact not found',
        );
        throw new NotificationStateException('pending-contact-expired');
      }

      const input = JSON.parse(raw) as CreatePendingUserDTO;

      const finalInput: CreatePendingUserDTO = {
        ...input,
        seatId,
        actorId,
        eventEndsAt,
      };

      try {
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
        throw new NotificationStateException('guest-confirmation-failed', e);
      }
    });
  }

  // @KafkaEvent(KafkaTopics.notification.createGuest)
  // async handleCreateGuest(
  //   payload: CreatePlusOneAccountDTO,
  //   context: IKafkaEventContext,
  // ): Promise<void> {
  //   return TraceRunner.run('[HANDLER] Create Guest', async () => {
  //     const headers = context.headers;
  //     const actorId = headers[KAFKA_HEADERS.ACTOR_ID] ?? 'Unkown';

  //     this.logger.debug('handleCreateGuest: %o | actorId=%s', payload, actorId);

  //     await this.userWriteService.createGuestUser();
  //     await this.adminWriteService.deleteUser(payload.userId, actorId);
  //   });
  // }
}
