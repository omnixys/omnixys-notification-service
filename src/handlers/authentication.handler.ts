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

import { NotificationWriteService } from '../modules/notification/services/notification-write.service.js';
import { Injectable } from '@nestjs/common';

import { SendAuthLinkDTO } from '@omnixys/contracts-ts';
import {
  IKafkaEventContext,
  KafkaEvent,
  KafkaEventHandler,
  KafkaTopics,
} from '@omnixys/kafka-ts';
import { OmnixysLogger } from '@omnixys/logger-ts';
import { TraceRunner } from '@omnixys/observability-ts';

/**
 * Kafka event handler responsible for useristrative commands such as
 * shutdown and restart. It listens for specific user-related topics
 * and delegates the actual process control logic to the {@link UserService}.
 *
 * @category Messaging
 * @since 1.0.0
 */
@KafkaEventHandler('authentication')
@Injectable()
export class AuthenticationHandler {
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
  ) {
    this.logger = loggerService.log(
      this.constructor.name,
    );
  }

  @KafkaEvent(KafkaTopics.notification.sendRequestReset)
  async handleSendRequestReset(
    payload: SendAuthLinkDTO,
    _context: IKafkaEventContext,
  ): Promise<void> {
    return TraceRunner.run('[HANDLER] Send Request Reset', async () => {
      this.logger.info('send_request_reset_received: %o', {
        username: payload.username,
        locale: payload.locale,
      });
      try {
        await this.service.sendRequestReset(payload);
        this.logger.info('send_request_reset_dispatched: %o', {
          username: payload.username,
        });
      } catch (error) {
        this.logger.error('send_request_reset_failed: %o', {
          username: payload.username,
          error,
        });
      }
    });
  }

  @KafkaEvent(KafkaTopics.notification.sendMagicLink)
  async handleSendMagicLink(
    payload: SendAuthLinkDTO,
    _context: IKafkaEventContext,
  ): Promise<void> {
    return TraceRunner.run('[HANDLER] Send Magic Link', async () => {
      this.logger.info('send_magic_link_received: %o', {
        username: payload.username,
        locale: payload.locale,
      });
      try {
        await this.service.sendMagicLink(payload);
        this.logger.info('send_magic_link_dispatched: %o', {
          username: payload.username,
        });
      } catch (error) {
        this.logger.error('send_magic_link_failed: %o', {
          username: payload.username,
          error,
        });
      }
    });
  }

  // @KafkaEvent(KafkaTopics.notification.notifyUser)
  // async handleNotifyUserCreation(
  //   payload: NotifyUserCreationDTO,
  //   _context: IKafkaEventContext,
  // ): Promise<void> {
  //   this.logger.debug('notifyUser payload=%o', payload);

  //   void this.service.notifyUser(payload);
  // }
}
