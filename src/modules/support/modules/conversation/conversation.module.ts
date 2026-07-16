import { SupportCommonModule } from '../../common/support-common.module.js';
import { ConversationResolver } from './conversation.resolver.js';
import { ConversationService } from './conversation.service.js';
import { Module } from '@nestjs/common';

@Module({
  imports: [SupportCommonModule],
  providers: [ConversationService, ConversationResolver],
  exports: [ConversationService],
})
export class ConversationModule {}
