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

import {
  KafkaEvent,
  KafkaHandler,
} from '../kafka/decorators/kafka-event.decorator.js';
import {
  type KafkaEventContext,
  KafkaEventHandler,
} from '../kafka/interface/kafka-event.interface.js';
import { getTopic, getTopics } from '../kafka/kafka-topic.properties.js';
import { LoggerPlusService } from '../logger/logger-plus.service.js';
import { NotificationWriteService } from '../notification/services/notification-write.service.js';
import { Injectable } from '@nestjs/common';
import {
  SendMagicLinkMessageDTO,
  SendResetLinkMessageDTO,
} from '@omnixys/contracts';

/**
 * Kafka event handler responsible for useristrative commands such as
 * shutdown and restart. It listens for specific user-related topics
 * and delegates the actual process control logic to the {@link UserService}.
 *
 * @category Messaging
 * @since 1.0.0
 */
@KafkaHandler('authentication')
@Injectable()
export class AuthenticationHandler implements KafkaEventHandler {
  private readonly logger;

  /**
   * Creates a new instance of {@link UserHandler}.
   *
   * @param loggerService - The central logger service used for structured logging.
   * @param userService - The service responsible for handling system-level user operations.
   */
  constructor(
    private readonly loggerService: LoggerPlusService,
    private readonly service: NotificationWriteService,
  ) {
    this.logger = this.loggerService.getLogger(AuthenticationHandler.name);
  }

  /**
   * Handles incoming Kafka user events and executes the appropriate useristrative command.
   *
   * @param topic - The Kafka topic representing the user command (e.g. shutdown, restart).
   * @param data - The payload associated with the Kafka message.
   * @param context - The Kafka context metadata containing headers and partition info.
   *
   * @returns A Promise that resolves once the command has been processed.
   */
  @KafkaEvent(
    ...getTopics('sendCredentials', 'sendRequestReset', 'sendMagicLink'),
  )
  async handle(
    topic: string,
    data: SendMagicLinkMessageDTO | SendResetLinkMessageDTO,
    context: KafkaEventContext,
  ): Promise<void> {
    this.logger.warn(`User command received: ${topic}`);
    this.logger.debug('Kafka context: %o', context);
    this.logger.debug('Kafka data: %o', data);

    switch (topic) {
      // case getTopic('sendCredentials'):
      //   await this.sendCredentials(data as { payload: UserCredentialDTO });
      //   break;

      case getTopic('sendRequestReset'):
        await this.sendRequestReset(data);
        break;

      case getTopic('sendMagicLink'):
        await this.sendMagigLink(data);
        break;

      default:
        this.logger.warn(`Unknown ticket topic: ${topic}`);
    }
  }

  // private async sendCredentials(data: {
  //   payload: UserCredentialDTO;
  // }): Promise<void> {
  //   await this.notificationWriteService.sendCredentials(data.payload);
  // }

  private async sendRequestReset(data: SendResetLinkMessageDTO): Promise<void> {
    void this.service.sendRequestReset(data.payload);
  }

  private async sendMagigLink(data: SendMagicLinkMessageDTO): Promise<void> {
    void this.service.sendMagicLink(data.payload);
  }
}
