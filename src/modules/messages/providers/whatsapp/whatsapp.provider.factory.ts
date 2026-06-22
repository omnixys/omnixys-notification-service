import { Logger } from '@nestjs/common';
import { NotificationChannelUnavailableException } from '../../../notification/errors/notification.error.js';
import { WhatsAppCloudProvider } from './whatsapp-cloud.provider.js';
import { WhatsAppWebProvider } from './whatsapp-web.provider.js';
import type {
  SendWhatsappInput,
  SendWhatsappResult,
  WhatsAppProvider,
} from './whatsapp.provider.interface.js';
import { WHATSAPP_PROVIDER } from './whatsapp.provider.token.js';
import type { Provider } from '@nestjs/common';

const logger = new Logger('WhatsAppProviderFactory');

export const WhatsAppProviderFactory: Provider = {
  provide: WHATSAPP_PROVIDER,
  useFactory: (
    cloud: WhatsAppCloudProvider,
    web: WhatsAppWebProvider,
  ): WhatsAppProvider => ({
    isReady: () => cloud.isReady() || web.isReady(),

    send: async (input: SendWhatsappInput): Promise<SendWhatsappResult> => {
      if (cloud.isReady()) {
        logger.debug('Selected WhatsAppCloudProvider');
        return cloud.send(input);
      }

      if (web.isReady()) {
        logger.debug('Selected WhatsAppWebProvider');
        return web.send(input);
      }

      logger.warn('No WhatsApp provider available — throwing');
      throw new NotificationChannelUnavailableException(
        'WHATSAPP',
        'no-provider-available',
      );
    },
  }),
  inject: [WhatsAppCloudProvider, WhatsAppWebProvider],
};
