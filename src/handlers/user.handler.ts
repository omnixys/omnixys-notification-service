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

import { LoggerPlusService } from '../logger/logger-plus.service.js';
import {
  KafkaEvent,
  KafkaHandler,
} from '../messaging/decorators/kafka-event.decorator.js';
import {
  KafkaEventContext,
  KafkaEventHandler,
} from '../messaging/interface/kafka-event.interface.js';
import { getTopic, getTopics } from '../messaging/kafka-topic.properties.js';
import {
  PasswordResetRequestDTO,
  SecurityPasswordResetAlertDTO,
} from '../notification/models/dto/password-reset.dto.js';
import { NotificationWriteService } from '../notification/services/notification-write.service.js';
import { Injectable } from '@nestjs/common';

/**
 * Handles user-related security events such as password reset requests.
 *
 * @category Messaging
 * @since 1.1.0
 */
@KafkaHandler('user')
@Injectable()
export class UserHandler implements KafkaEventHandler {
  private readonly logger;

  constructor(
    private readonly loggerService: LoggerPlusService,
    private readonly notificationWriteService: NotificationWriteService,
  ) {
    this.logger = this.loggerService.getLogger(UserHandler.name);
  }

  @KafkaEvent(...getTopics('resetPassword', 'sendSecurityAlert'))
  async handle(
    topic: string,
    data: { payload: unknown },
    context: KafkaEventContext,
  ): Promise<void> {
    this.logger.warn(`User security event received: ${topic}`);
    this.logger.debug('Kafka context: %o', context);

    switch (topic) {
      case getTopic('resetPassword'):
        await this.handlePasswordResetRequest(
          data as { payload: PasswordResetRequestDTO },
        );
        break;

      case getTopic('sendSecurityAlert'):
        await this.handleSecurityAlert(
          data as { payload: SecurityPasswordResetAlertDTO },
        );
        break;

      default:
        this.logger.warn(`Unhandled user topic: ${topic}`);
    }
  }

  /**
   * Sends password reset confirmation email to the user.
   */
  private async handlePasswordResetRequest(data: {
    payload: PasswordResetRequestDTO;
  }): Promise<void> {
    await this.notificationWriteService.sendPasswordResetRequest(data.payload);
  }

  /**
   * Sends internal security alert to Omnixys team.
   */
  private async handleSecurityAlert(data: {
    payload: SecurityPasswordResetAlertDTO;
  }): Promise<void> {
    await this.notificationWriteService.sendSecurityPasswordResetAlert(
      data.payload,
    );
  }
}
