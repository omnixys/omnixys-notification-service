import { AuthModule } from '../auth/auth.module.js';
import { KafkaModule } from '../messaging/kafka.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { TemplateModule } from '../template/template.module.js';
import { EmailNotificationProvider } from './providers/email/email.provider.js';
import { WhatsAppNotificationProvider } from './providers/whatsapp/whatsapp.provider.js';
import { NotificationMutationResolver } from './resolver/notification-mutation.resolver.js';
import { NotificationQueryResolver } from './resolver/notification-query.resolver.js';
import { NotificationReadService } from './services/notification-read.service.js';
import { NotificationWriteService } from './services/notification-write.service.js';
import { NotificationRenderer } from './utils/notification.renderer.js';
import { Module } from '@nestjs/common';

@Module({
  imports: [PrismaModule, AuthModule, TemplateModule, KafkaModule],
  providers: [
    NotificationRenderer,
    NotificationQueryResolver,
    NotificationMutationResolver,
    NotificationReadService,
    NotificationWriteService,
    EmailNotificationProvider,
    WhatsAppNotificationProvider,
  ],
  exports: [NotificationReadService, NotificationWriteService],
})
export class NotificationModule {}
