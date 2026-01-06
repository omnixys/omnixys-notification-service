import { ScalarsModule } from '../core/scalars/scalar.module.js';
import { KafkaModule } from '../messaging/kafka.module.js';
import { EmailNotificationProvider } from '../notification/providers/email/email.provider.js';
import { WhatsAppNotificationProvider } from '../notification/providers/whatsapp/whatsapp.provider.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { TemplateMutationResolver } from './resolvers/template-mutation.resolver.js';
import { TemplateQueryResolver } from './resolvers/template-query.resolver.js';
import { TemplateReadService } from './services/template-read.service.js';
import { TemplateWriteService } from './services/template-write.service.js';
import { Module } from '@nestjs/common';

@Module({
  imports: [PrismaModule, ScalarsModule, KafkaModule],
  providers: [
    TemplateQueryResolver,
    TemplateMutationResolver,
    TemplateReadService,
    TemplateWriteService,
    EmailNotificationProvider,
    WhatsAppNotificationProvider,
  ],
  exports: [TemplateReadService, TemplateWriteService],
})
export class TemplateModule {}
