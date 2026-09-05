import { EmailSupportService } from './email-support.service.js';
import { Injectable } from '@nestjs/common';
import type { EmailReceivedDTO } from '@omnixys/contracts-ts';
import {
  KafkaHandler,
  KafkaTopics,
  type KafkaEventContext,
} from '@omnixys/kafka-ts';
import { OmnixysLogger } from '@omnixys/logger-ts';

@Injectable()
export class EmailHandler {
  private readonly logger;

  constructor(
    loggerService: OmnixysLogger,
    private readonly emailSupportService: EmailSupportService,
  ) {
    this.logger = loggerService.log(
      'service:notification',
      this.constructor.name,
    );
  }

  @KafkaHandler(KafkaTopics.email.inboundReceived)
  async handleInboundEmail(
    payload: EmailReceivedDTO,
    _context: KafkaEventContext,
  ): Promise<void> {
    if (!payload.from) {
      this.logger.warn('Inbound email missing from address — skipping');
      return;
    }

    this.logger.debug(
      'Processing inbound email: messageId=%s from=%s subject=%s',
      payload.messageId ?? '(no message-id)',
      payload.from,
      payload.subject ?? '(no subject)',
    );

    try {
      await this.emailSupportService.handleInbound(payload);
      this.logger.info(
        'Inbound email processed: messageId=%s from=%s',
        payload.messageId ?? '(unknown)',
        payload.from,
      );
    } catch (error) {
      this.logger.error(
        'Failed to process inbound email: messageId=%s error=%s',
        payload.messageId ?? '(unknown)',
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}
