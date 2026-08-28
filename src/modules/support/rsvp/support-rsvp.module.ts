import { ConversationModule } from '../modules/conversation/conversation.module.js';
import { MessageModule } from '../modules/message/message.module.js';
import { InvitationSupportClientService } from './invitation-support-client.service.js';
import { SupportRsvpResolver } from './support-rsvp.resolver.js';
import { SupportRsvpService } from './support-rsvp.service.js';
import { Module } from '@nestjs/common';

@Module({
  imports: [ConversationModule, MessageModule],
  providers: [InvitationSupportClientService, SupportRsvpService, SupportRsvpResolver],
  exports: [InvitationSupportClientService, SupportRsvpService],
})
export class SupportRsvpModule {}
