import { DispatchService } from '../../../../modules/messages/services/dispatch.service.js';
import {
  ConversationAccessDeniedException,
  ConversationNotFoundException,
  ConversationClosedException,
} from '../../../../modules/notification/errors/notification.error.js';
import type { SupportMessage } from '../../../../prisma/generated/client.js';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { Injectable } from '@nestjs/common';
import { ValkeyPubSubService } from '@omnixys/cache';
import { EventPermissionKey } from '@omnixys/contracts';
import type {
  ConversationChannel,
  SupportMessageReceivedDTO,
  EmailOutboundDTO,
  ConversationChannelMessageDTO,
} from '@omnixys/contracts';
import { KafkaProducerService, KafkaTopics } from '@omnixys/kafka';
import { OmnixysLogger, type ScopedLogger } from '@omnixys/logger';
import { EventPermissionResolver } from '@omnixys/security';
import type { CurrentUserData } from '@omnixys/security';

@Injectable()
export class MessageService {
  private readonly logger: ScopedLogger;

  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatchService: DispatchService,
    private readonly kafka: KafkaProducerService,
    private readonly valkeyPubSub: ValkeyPubSubService,
    private readonly permissionResolver: EventPermissionResolver,
    omnixysLogger: OmnixysLogger,
  ) {
    this.logger = omnixysLogger.log(MessageService.name);
  }

  async getMessages(
    conversationId: string,
    user: CurrentUserData,
    limit = 100,
  ): Promise<SupportMessage[]> {
    const conversation = await this.prisma.supportConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new ConversationNotFoundException(conversationId);
    }

    if (!(await this.canAccessMessages(conversation, user))) {
      throw new ConversationAccessDeniedException(conversationId);
    }

    return this.prisma.supportMessage.findMany({
      where: { conversationId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  async sendMessage(
    conversationId: string,
    data: {
      body?: string;
      mediaUrl?: string;
      mimeType?: string;
    },
    user: CurrentUserData,
  ): Promise<SupportMessage> {
    const conversation = await this.prisma.supportConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new ConversationNotFoundException(conversationId);
    }

    const isGuestOwner = conversation.guestUserId === user.id;
    const canRespond = await this.hasEventPermission(
      conversation.eventId,
      user,
      EventPermissionKey.RespondSupport,
    );

    if (!isGuestOwner && !canRespond) {
      throw new ConversationAccessDeniedException(conversationId);
    }

    if (conversation.status === 'CLOSED') {
      throw new ConversationClosedException(conversationId);
    }

    const fromGuest = isGuestOwner;

    const [message] = await this.prisma.$transaction([
      this.prisma.supportMessage.create({
        data: {
          conversationId,
          direction: fromGuest ? 'INBOUND' : 'OUTBOUND',
          channel: conversation.channel,
          fromUserId: user.id,
          fromGuest,
          body: data.body,
          mediaUrl: data.mediaUrl,
          mimeType: data.mimeType,
          status: 'SENT',
        },
      }),
      this.prisma.supportConversation.update({
        where: { id: conversationId },
        data: {
          lastMessageAt: new Date(),
          lastMessagePreview: (data.body ?? '(media)').slice(0, 100),
          ...(fromGuest ? { unreadCount: { increment: 1 } } : {}),
        },
      }),
    ]);

    const conversationUnreadCount = fromGuest
      ? (conversation.unreadCount ?? 0) + 1
      : (conversation.unreadCount ?? 0);

    try {
      await this.valkeyPubSub.publish(`unreadCount.updated.${conversationId}`, {
        conversationId,
        unreadCount: conversationUnreadCount,
        eventId: conversation.eventId,
      });
    } catch {
      // Valkey publish failure is non-critical
    }

    await this.kafka.send({
      topic: fromGuest
        ? KafkaTopics.conversation.guestReplied
        : KafkaTopics.conversation.agentReplied,
      payload: {
        id: message.id,
        conversationId: message.conversationId,
        direction: message.direction,
        channel: message.channel,
        fromUserId: message.fromUserId ?? undefined,
        fromGuest: message.fromGuest,
        body: message.body ?? undefined,
        mediaUrl: message.mediaUrl ?? undefined,
        mimeType: message.mimeType ?? undefined,
        status: message.status,
        createdAt: message.createdAt.toISOString(),
      } satisfies SupportMessageReceivedDTO,
      meta: {
        clazz: this.constructor.name,
        type: 'EVENT',
        service: 'support-message-service',
        operation: fromGuest ? 'Guest Replied' : 'Agent Replied',
        version: '1',
        actorId: user.id,
        tenantId: 'omnixys',
      },
    });

    // ── Channel-specific outbound routing ──
    if (conversation.channel === 'EMAIL' && !fromGuest) {
      await this.kafka.send({
        topic: KafkaTopics.email.outboundSend,
        payload: {
          to: conversation.guestContact ?? '',
          subject: conversation.subject ? `Re: ${conversation.subject}` : 'Support Reply',
          body: data.body ?? '',
          inReplyTo: conversation.emailMessageId ?? undefined,
          references: [conversation.emailReferences ?? conversation.emailMessageId]
            .filter(Boolean)
            .join(' '),
          conversationId,
          messageId: message.id,
        } satisfies EmailOutboundDTO,
        meta: {
          clazz: this.constructor.name,
          type: 'COMMAND',
          service: 'support-message-service',
          operation: 'Outbound Email Message',
          version: '1',
          actorId: user.id,
          tenantId: 'omnixys',
        },
      });
    } else if (conversation.channel !== 'EMAIL' && !fromGuest) {
      const recipient = conversation.guestContact ?? '';

      const dispatchResult = await this.dispatchService.dispatch({
        id: message.id,
        channel: conversation.channel as 'WHATSAPP',
        recipientId: recipient,
        recipientAddress: recipient,
        body: data.body ?? '',
        contentType: 'TEXT',
        metadata: {
          conversationId,
        },
      });

      await this.prisma.messageDelivery.create({
        data: {
          id: message.id,
          messageId: message.id,
          channel: conversation.channel,
          status: dispatchResult.success ? 'SENT' : 'FAILED',
          providerRef: dispatchResult.providerMessageId,
        },
      });

      if (!dispatchResult.success) {
        this.logger.warn(
          'Dispatch failed for support message: messageId=%s channel=%s error=%s',
          message.id,
          conversation.channel,
          dispatchResult.error,
        );
      }

      await this.kafka.send({
        topic: KafkaTopics.conversation.channelMessage,
        payload: {
          conversationId,
          channel: conversation.channel as ConversationChannel,
          to: recipient,
          body: data.body ?? '',
          externalId: message.id,
        } satisfies ConversationChannelMessageDTO,
        meta: {
          clazz: this.constructor.name,
          type: 'COMMAND',
          service: 'support-message-service',
          operation: 'Outbound Channel Message',
          version: '1',
          actorId: user.id,
          tenantId: 'omnixys',
        },
      });
    }

    return message;
  }

  private async canAccessMessages(
    conversation: { eventId: string; guestUserId?: string | null },
    user: CurrentUserData,
  ): Promise<boolean> {
    if (conversation.guestUserId === user.id) {
      return true;
    }

    return this.hasEventPermission(conversation.eventId, user, EventPermissionKey.ViewSupport);
  }

  private async hasEventPermission(
    eventId: string,
    user: CurrentUserData,
    permission: EventPermissionKey,
  ): Promise<boolean> {
    const permissions = await this.permissionResolver.getPermissionsForUser(user.id, eventId);
    return permissions.includes(permission);
  }
}
