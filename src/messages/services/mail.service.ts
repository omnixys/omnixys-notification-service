/* eslint-disable @typescript-eslint/explicit-function-return-type */

import { LoggerPlus } from '../../logger/logger-plus.js';
import { LoggerPlusService } from '../../logger/logger-plus.service.js';
import { SendMailDTO } from '../models/dto/send-mail.dto.js';
import { MailProvider } from '../providers/mail-provider.interface.js';
import { MAIL_PROVIDER } from '../providers/mail-provider.token.js';
import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class MailService {
  private readonly logger: LoggerPlus;

  constructor(
    loggerService: LoggerPlusService,
    @Inject(MAIL_PROVIDER) private readonly provider: MailProvider,
  ) {
    this.logger = loggerService.getLogger(MailService.name);
  }

  async send(dto: SendMailDTO) {
    this.logger.debug('Sending mail to=%s subject=%s', dto.to, dto.subject);

    if (!dto.html && !dto.text) {
      throw new InternalServerErrorException('Mail must contain either html or text content');
    }

    try {
      const result = await this.provider.send(dto);

      this.logger.info('Mail sent successfully to=%s providerRef=%s', dto.to, result.providerRef);

      return result;
    } catch (error) {
      this.logger.error('Mail sending failed to=%s error=%o', dto.to, error);

      throw new InternalServerErrorException('Mail sending failed');
    }
  }
}
