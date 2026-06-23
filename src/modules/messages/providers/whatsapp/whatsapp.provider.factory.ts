import { NotificationChannelUnavailableException } from '../../../notification/errors/notification.error.js';
import { WhatsAppCloudProvider } from './whatsapp-cloud.provider.js';
import { WhatsAppWebProvider } from './whatsapp-web.provider.js';
import type {
  SendWhatsappInput,
  SendWhatsappResult,
  WhatsAppProvider,
} from './whatsapp.provider.interface.js';
import { WHATSAPP_PROVIDER } from './whatsapp.provider.token.js';
import { Logger } from '@nestjs/common';
import type { Provider } from '@nestjs/common';

const logger = new Logger('WhatsAppProviderFactory');

export const WhatsAppProviderFactory: Provider<WhatsAppProvider> = {
  provide: WHATSAPP_PROVIDER,
  useFactory: (
    cloud: WhatsAppCloudProvider,
    web: WhatsAppWebProvider,
  ): WhatsAppProvider => ({
    isReady: () => web.isReady() || cloud.isReady(),

    send: async (input: SendWhatsappInput): Promise<SendWhatsappResult> => {
      const webReady = web.isReady();
      const webState =
        typeof (web as unknown as { getState(): string }).getState ===
        'function'
          ? (web as unknown as { getState(): string }).getState()
          : 'unknown';
      const cloudReady = cloud.isReady();

      logger.log(
        'Provider selection: web.isReady()=%s web.state=%s cloud.isReady()=%s',
        webReady,
        webState,
        cloudReady,
      );

      if (webReady) {
        logger.log('Selected WhatsAppWebProvider (web priority)');
        return web.send(input);
      }

      if (cloudReady) {
        logger.log('Selected WhatsAppCloudProvider (cloud fallback)');
        return cloud.send(input);
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
