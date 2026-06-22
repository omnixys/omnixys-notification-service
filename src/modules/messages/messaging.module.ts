import { StreamBootstrapService } from './infrastructure/stream-bootstrap.service.js';
import { MAIL_PROVIDER } from './providers/mail/mail-provider.token.js';
import { ResendProvider } from './providers/mail/resend.provider.js';
import { WhatsAppCloudProvider } from './providers/whatsapp/whatsapp-cloud.provider.js';
import { WhatsAppWebProvider } from './providers/whatsapp/whatsapp-web.provider.js';
import { WhatsAppProviderFactory } from './providers/whatsapp/whatsapp.provider.factory.js';
import { WHATSAPP_PROVIDER } from './providers/whatsapp/whatsapp.provider.token.js';
import { MailService } from './services/mail.service.js';
import { WhatsAppService } from './services/whatsapp.service.js';
import { Module } from '@nestjs/common';

@Module({
  imports: [],
  providers: [
    MailService,
    {
      provide: MAIL_PROVIDER,
      useClass: ResendProvider,
    },

    WhatsAppService,
    WhatsAppCloudProvider,
    WhatsAppWebProvider,
    WhatsAppProviderFactory,
    StreamBootstrapService,
  ],
  exports: [MailService, WhatsAppService, WhatsAppWebProvider, WHATSAPP_PROVIDER],
})
export class MessagingModule {}
