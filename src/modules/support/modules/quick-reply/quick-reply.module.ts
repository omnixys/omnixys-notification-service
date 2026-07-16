import { QuickReplyResolver } from './quick-reply.resolver.js';
import { QuickReplyService } from './quick-reply.service.js';
import { Module } from '@nestjs/common';

@Module({
  providers: [QuickReplyService, QuickReplyResolver],
  exports: [QuickReplyService],
})
export class QuickReplyModule {}
