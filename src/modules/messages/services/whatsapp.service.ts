import { NotificationDeliveryException } from '../../notification/errors/notification.error.js';
import type {
  SendWhatsappInput,
  WhatsAppProvider,
} from '../providers/whatsapp/whatsapp.provider.interface.js';
import { WHATSAPP_PROVIDER } from '../providers/whatsapp/whatsapp.provider.token.js';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class WhatsAppService {
  constructor(
    @Inject(WHATSAPP_PROVIDER)
    private readonly provider: WhatsAppProvider,
  ) {}

  async send(input: SendWhatsappInput): Promise<void> {
    try {
      await this.provider.send(input);
    } catch (error) {
      if (isStructuredError(error)) {
        throw error;
      }
      throw new NotificationDeliveryException('WHATSAPP', error);
    }
  }
}

function isStructuredError(error: unknown): error is { code: string } {
  return (
    !!error && typeof error === 'object' && typeof (error as { code?: unknown }).code === 'string'
  );
}
