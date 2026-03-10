/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
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
import { UserCredentialDTO } from '../notification/models/dto/user-created-schema.dto.js';
import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

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
  private readonly appBaseUrl: string;
  private readonly resetPath: string;
  private readonly resend: Resend;
  private readonly from: string;

  /**
   * Creates a new instance of {@link UserHandler}.
   *
   * @param loggerService - The central logger service used for structured logging.
   * @param userService - The service responsible for handling system-level user operations.
   */
  constructor(private readonly loggerService: LoggerPlusService) {
    this.logger = this.loggerService.getLogger(AuthenticationHandler.name);
    this.appBaseUrl = process.env.APP_BASE_URL ?? '';
    this.resetPath = process.env.RESET_PATH ?? '/reset';
    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.from = process.env.MAIL_FROM ?? 'no-reply@example.com';
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
    ...getTopics('sendCredentials', 'sendRequestReset', 'sendMagigLink'),
  )
  async handle(
    topic: string,
    data: { payload: UserCredentialDTO },
    context: KafkaEventContext,
  ): Promise<void> {
    this.logger.warn(`User command received: ${topic}`);
    this.logger.debug('Kafka context: %o', context);

    switch (topic) {
      // case getTopic('sendCredentials'):
      //   await this.sendCredentials(data as { payload: UserCredentialDTO });
      //   break;

      case getTopic('sendRequestReset'):
        await this.sendRequestReset(data as any);
        break;

      case getTopic('sendMagigLink'):
        await this.sendMagigLink(data as any);
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

  private async sendRequestReset(data: {
    payload: { rawToken: string; email: string };
  }): Promise<void> {
    const resetUrl = `${this.appBaseUrl}${this.resetPath}?token=${encodeURIComponent(data.payload.rawToken)}`;

    try {
      await this.resend.emails.send({
        from: this.from,
        to: data.payload.email,
        subject: 'Reset your password',
        html: this.buildResetHtml(resetUrl),
        text: this.buildResetText(resetUrl),
      });
    } catch (error: any) {
      this.logger.error('Failed to send reset email', {
        email: data.payload.email,
        error: error?.message,
      });
      throw error;
    }
  }

  private async sendMagigLink(data: {
    payload: { token: string; email: string };
  }): Promise<void> {
    const resetUrl = `${this.appBaseUrl}/verify?token=${encodeURIComponent(data.payload.token)}`;

    try {
      await this.resend.emails.send({
        from: this.from,
        to: data.payload.email,
        subject: 'Reset your password',
        html: this.buildResetHtml(resetUrl),
        text: this.buildResetText(resetUrl),
      });
    } catch (error: any) {
      this.logger.error('Failed to send reset email', {
        email: data.payload.email,
        error: error?.message,
      });
      throw error;
    }
  }

  private buildResetHtml(resetUrl: string): string {
    return `
      <div style="font-family: Arial, sans-serif;">
        <h2>Password Reset</h2>
        <p>You requested to reset your password.</p>
        <p>This link expires in 15 minutes.</p>
        <a href="${resetUrl}" 
           style="display:inline-block;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:6px;">
           Reset Password
        </a>
        <p>If you did not request this, ignore this email.</p>
      </div>
    `;
  }

  private buildResetText(resetUrl: string): string {
    return `
Password Reset

You requested to reset your password.
This link expires in 15 minutes.

Reset here:
${resetUrl}

If you did not request this, ignore this email.
`;
  }
}
