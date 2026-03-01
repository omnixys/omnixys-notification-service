import { AuthModule } from '../auth/auth.module.js';
import { KafkaModule } from '../kafka/kafka.module.js';
import { MessageModule } from '../messages/message.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { TemplateModule } from '../template/template.module.js';
import { ValkeyModule } from '../valkey/valkey.module.js';
import { NotificationMutationResolver } from './resolver/notification-mutation.resolver.js';
import { NotificationQueryResolver } from './resolver/notification-query.resolver.js';
import { NotificationCacheService } from './services/notification-cache.service.js';
import { NotificationReadService } from './services/notification-read.service.js';
import { NotificationWriteService } from './services/notification-write.service.js';
import { TemplateRenderService } from './services/template-renderer.service.js';
import { NotificationRenderer } from './utils/notification.renderer.js';
import { Module } from '@nestjs/common';

@Module({
  imports: [PrismaModule, AuthModule, TemplateModule, KafkaModule, ValkeyModule, MessageModule],
  providers: [
    NotificationRenderer,
    NotificationQueryResolver,
    NotificationMutationResolver,
    NotificationReadService,
    NotificationWriteService,
    NotificationCacheService,
    TemplateRenderService,
  ],
  exports: [NotificationReadService, NotificationWriteService, TemplateRenderService],
})
export class NotificationModule {}
