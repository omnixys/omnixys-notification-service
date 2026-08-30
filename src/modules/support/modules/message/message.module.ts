import { MessagingModule } from '../../../../modules/messages/messaging.module.js';
import { SupportCommonModule } from '../../common/support-common.module.js';
import { MappingModule } from '../mapping/mapping.module.js';
import { MessageResolver } from './message.resolver.js';
import { MessageService } from './message.service.js';
import { Module } from '@nestjs/common';

@Module({
  imports: [SupportCommonModule, MessagingModule, MappingModule],
  providers: [MessageService, MessageResolver],
  exports: [MessageService],
})
export class MessageModule {}
