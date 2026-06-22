import {
  NotificationChannelUnavailableException,
  NotificationDeliveryException,
} from '../../notification/errors/notification.error.js';
import type {
  SendWhatsappInput,
  WhatsAppProvider,
} from '../providers/whatsapp/whatsapp.provider.interface.js';
import { WHATSAPP_PROVIDER } from '../providers/whatsapp/whatsapp.provider.token.js';
import { Inject, Injectable } from '@nestjs/common';

const SEND_TIMEOUT_MS = 2_000;

@Injectable()
export class WhatsAppService {
  constructor(
    @Inject(WHATSAPP_PROVIDER)
    private readonly provider: WhatsAppProvider,
  ) {}

  async send(input: SendWhatsappInput): Promise<void> {
    try {
      await Promise.race([
        this.provider.send(input),
        rejectAfter(SEND_TIMEOUT_MS, 'WhatsApp send timed out'),
      ]);
    } catch (error) {
      if (isStructuredError(error)) {
        throw error;
      }
      throw new NotificationDeliveryException('WHATSAPP', error);
    }
  }
}

function rejectAfter(ms: number, message: string): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new NotificationChannelUnavailableException('WHATSAPP', message)), ms),
  );
}

function isStructuredError(error: unknown): error is { code: string } {
  return (
    !!error && typeof error === 'object' && typeof (error as { code?: unknown }).code === 'string'
  );
}
