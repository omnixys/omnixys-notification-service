/* eslint-disable @typescript-eslint/explicit-function-return-type */

import {
  NotificationDeliveryException,
  NotificationInputException,
} from '../../notification/errors/notification.error.js';
import { SendMailDTO } from '../models/dto/send-mail.dto.js';
import type { MailProvider } from '../providers/mail/mail-provider.interface.js';
import { MAIL_PROVIDER } from '../providers/mail/mail-provider.token.js';
import { Inject, Injectable } from '@nestjs/common';
import { OmnixysLogger } from '@omnixys/logger';

@Injectable()
export class MailService {
  private readonly logger;

  constructor(
    loggerService: OmnixysLogger,
    @Inject(MAIL_PROVIDER) private readonly provider: MailProvider,
  ) {
    this.logger = loggerService.log(this.constructor.name);
  }

  async send(dto: SendMailDTO) {
    const notificationId = dto.metadata?.notificationId ?? 'unknown';

    this.logger.debug('Mail send requested: notificationId=%s to=%s', notificationId, dto.to);

    if (!dto.html && !dto.text) {
      this.logger.error(
        'Mail creation failed: notificationId=%s error=%s',
        notificationId,
        'Mail content is missing',
      );
      throw new NotificationInputException('mail-content-missing', {
        notificationId,
      });
    }

    try {
      this.logger.debug('Invoking mail provider: notificationId=%s', notificationId);
      const result = await this.provider.send(dto);

      this.logger.info(
        'Mail sent successfully: notificationId=%s to=%s providerRef=%s',
        notificationId,
        dto.to,
        result.providerRef,
      );

      return result;
    } catch (error) {
      this.logger.error(
        'Mail sending failed: notificationId=%s to=%s error=%s',
        notificationId,
        dto.to,
        error instanceof Error ? error.message : String(error),
      );

      throw new NotificationDeliveryException('EMAIL', error, {
        notificationId,
      });
    }
  }
}
