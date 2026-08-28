import { ConversationService } from '../modules/conversation/conversation.service.js';
import { ConversationChannel } from '../modules/conversation/entities/support-conversation.entity.js';
import { SupportConversation } from '../modules/conversation/entities/support-conversation.entity.js';
import { SupportMessage } from '../modules/message/entities/support-message.entity.js';
import { MessageService } from '../modules/message/message.service.js';
import { InvitationSupportClientService } from './invitation-support-client.service.js';
import { Injectable } from '@nestjs/common';

export interface RsvpConversationResult {
  conversation: SupportConversation | null;
  messages: SupportMessage[];
}

/**
 * Public, invitation-capability-driven flow for RSVP guests. Every operation
 * re-validates the invitation server-side (fail-closed) and resolves the
 * conversation strictly by (eventId, invitationId). Guest name/contact are
 * always derived from the invitation service, never from the client.
 */
@Injectable()
export class SupportRsvpService {
  constructor(
    private readonly invitationClient: InvitationSupportClientService,
    private readonly conversationService: ConversationService,
    private readonly messageService: MessageService,
  ) {}

  async conversation(invitationId: string): Promise<RsvpConversationResult> {
    const context = await this.invitationClient.resolve(invitationId);
    const conversation = await this.conversationService.findByInvitation(
      context.eventId,
      context.invitationId,
    );
    const messages = conversation
      ? await this.messageService.getMessagesByInvitation(
          context.eventId,
          context.invitationId,
          100,
        )
      : [];
    return {
      conversation: conversation as unknown as SupportConversation,
      messages: messages as unknown as SupportMessage[],
    };
  }

  async messages(invitationId: string, limit = 100): Promise<SupportMessage[]> {
    const context = await this.invitationClient.resolve(invitationId);
    const conversation = await this.conversationService.findByInvitation(
      context.eventId,
      context.invitationId,
    );
    if (!conversation) {
      return [];
    }
    const messages = await this.messageService.getMessagesByInvitation(
      context.eventId,
      context.invitationId,
      limit,
    );
    return messages as unknown as SupportMessage[];
  }

  async sendMessage(
    invitationId: string,
    body?: string,
    mediaUrl?: string,
  ): Promise<SupportMessage> {
    const context = await this.invitationClient.resolve(invitationId);
    if (!body?.trim() && !mediaUrl) {
      throw new Error('A message body or media is required');
    }
    const conversation = await this.conversationService.findByInvitation(
      context.eventId,
      context.invitationId,
    );
    if (!conversation) {
      await this.conversationService.createForInvitation(context.eventId, {
        invitationId: context.invitationId,
        guestName: context.guestName,
        guestContact: context.guestContact ?? undefined,
        channel: ConversationChannel.WEBCHAT,
        firstMessage: body?.trim() ?? '',
      });
      const createdMessages = await this.messageService.getMessagesByInvitation(
        context.eventId,
        context.invitationId,
        1,
      );
      const firstMessage = createdMessages[0];
      if (!firstMessage) {
        throw new Error('Support message could not be created');
      }
      return firstMessage as unknown as SupportMessage;
    }
    const message = await this.messageService.sendMessageByInvitation(
      context.eventId,
      context.invitationId,
      { body, mediaUrl },
    );
    return message as unknown as SupportMessage;
  }

  async markAsRead(invitationId: string): Promise<SupportConversation> {
    const context = await this.invitationClient.resolve(invitationId);
    const conversation = await this.conversationService.markAsReadByInvitation(
      context.eventId,
      context.invitationId,
    );
    return conversation as unknown as SupportConversation;
  }
}
