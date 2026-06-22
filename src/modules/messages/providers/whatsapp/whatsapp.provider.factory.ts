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

const stubProvider: WhatsAppProvider = {
  isReady: () => false,
  send: async (_input: SendWhatsappInput): Promise<SendWhatsappResult> => {
    throw new NotificationChannelUnavailableException(
      'WHATSAPP',
      'no-provider-available',
    );
  },
};

export const WhatsAppProviderFactory: Provider = {
  provide: WHATSAPP_PROVIDER,
  useFactory: async (
    cloud: WhatsAppCloudProvider,
    web: WhatsAppWebProvider,
  ): Promise<WhatsAppProvider> => {
    if (cloud.isReady()) {
      return cloud;
    }

    if (web.isReady()) {
      return web;
    }

    return stubProvider;
  },
  inject: [WhatsAppCloudProvider, WhatsAppWebProvider],
};
