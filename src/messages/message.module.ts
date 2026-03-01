import { MAIL_PROVIDER } from './providers/mail-provider.token.js';
import { ResendProvider } from './providers/resend.provider.js';
import { MailService } from './services/mail.service.js';
import { Module } from '@nestjs/common';

@Module({
  imports: [],
  providers: [
    MailService,
    {
      provide: MAIL_PROVIDER,
      useClass: ResendProvider,
    },
  ],
  exports: [MailService],
})
export class MessageModule {}
