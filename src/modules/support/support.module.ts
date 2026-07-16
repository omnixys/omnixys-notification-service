import { SupportCommonModule } from './common/support-common.module.js';
import { AssignmentModule } from './modules/assignment/assignment.module.js';
import { ConversationModule } from './modules/conversation/conversation.module.js';
import { MappingModule } from './modules/mapping/mapping.module.js';
import { MessageModule } from './modules/message/message.module.js';
import { OutboxModule } from './modules/outbox/outbox.module.js';
import { QuickReplyModule } from './modules/quick-reply/quick-reply.module.js';
import { WorkflowModule } from './modules/workflow/workflow.module.js';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    ConversationModule,
    MappingModule,
    MessageModule,
    WorkflowModule,
    AssignmentModule,
    OutboxModule,
    QuickReplyModule,
    SupportCommonModule,
  ],
  exports: [
    ConversationModule,
    MappingModule,
    MessageModule,
    WorkflowModule,
    AssignmentModule,
    OutboxModule,
    QuickReplyModule,
    SupportCommonModule,
  ],
})
export class SupportModule {}
