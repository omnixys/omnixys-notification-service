/* eslint-disable @typescript-eslint/explicit-function-return-type */

// mail/providers/resend.provider.ts

import { env } from '../../../../config/env.js';
import { SendMailDTO } from '../../models/dto/send-mail.dto.js';
import { MailProvider } from './mail-provider.interface.js';
import { Injectable } from '@nestjs/common';
import { OmnixysLogger } from '@omnixys/logger';
import { Resend } from 'resend';

const { RESEND_API_KEY } = env;
@Injectable()
export class ResendProvider implements MailProvider {
  private resend: Resend;
  private readonly logger;

  constructor(loggerService: OmnixysLogger) {
    this.logger = loggerService.log(this.constructor.name);
    this.resend = new Resend(RESEND_API_KEY);
  }

  async send(dto: SendMailDTO) {
    const notificationId = dto.metadata?.notificationId ?? 'unknown';

    try {
      this.logger.debug(
        'Sending mail through Resend: notificationId=%s to=%s',
        notificationId,
        dto.to,
      );
      const response = await this.resend.emails.send({
        from: dto.from ?? 'no-reply@omnixys.com',
        to: dto.to,
        subject: dto.subject,
        html: dto.html ?? '',
        text: dto.text,
        replyTo: dto.replyTo,
      });

      this.logger.info(
        'Resend mail sent successfully: notificationId=%s providerRef=%s',
        notificationId,
        response.data?.id,
      );

      return {
        provider: 'resend',
        providerRef: response.data?.id,
      };
    } catch (error: unknown) {
      this.logger.error(
        'Resend mail sending failed: notificationId=%s to=%s error=%s',
        notificationId,
        dto.to,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }
}
