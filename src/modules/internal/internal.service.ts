import type {
  InternalConversation,
  InternalMessage,
  InternalParticipant,
} from '../../prisma/generated/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  ConversationAccessDeniedException,
  ConversationNotFoundException,
} from '../notification/errors/notification.error.js';
import { Injectable } from '@nestjs/common';
import { EventPermissionKey } from '@omnixys/contracts';
import type {
  InternalConversationCreatedDTO,
  InternalMessageSentDTO,
  InternalReadReceiptDTO,
} from '@omnixys/contracts';
import { KafkaProducerService, KafkaTopics } from '@omnixys/kafka';
import { EventPermissionResolver } from '@omnixys/security';
import type { CurrentUserData } from '@omnixys/security';

@Injectable()
export class InternalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kafka: KafkaProducerService,
    private readonly permissionResolver: EventPermissionResolver,
  ) {}

  async findConversations(eventId: string, user: CurrentUserData): Promise<InternalConversation[]> {
    await this.requireSupportView(eventId, user);

    return this.prisma.internalConversation.findMany({
      where: {
        eventId,
        isActive: true,
        OR: [
          { type: 'BROADCAST' },
          { type: 'ROLE_CHANNEL' },
          {
            type: 'DIRECT',
            participants: { some: { userId: user.id, leftAt: null } },
          },
        ],
      },
      include: { participants: { where: { leftAt: null } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findConversationById(id: string, user: CurrentUserData): Promise<InternalConversation> {
    const conversation = await this.prisma.internalConversation.findUnique({
      where: { id },
    });

    if (!conversation) {
      throw new ConversationNotFoundException(id);
    }

    if (!(await this.canAccessConversation(conversation, user))) {
      throw new ConversationAccessDeniedException(id);
    }

    return conversation;
  }

  async findMessages(
    conversationId: string,
    user: CurrentUserData,
    limit = 100,
  ): Promise<InternalMessage[]> {
    await this.findConversationById(conversationId, user);

    if (!(await this.isParticipant(conversationId, user.id))) {
      throw new ConversationAccessDeniedException(conversationId);
    }

    return this.prisma.internalMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  async createConversation(
    eventId: string,
    data: {
      title: string;
      description?: string;
      type: 'BROADCAST' | 'DIRECT' | 'ROLE_CHANNEL';
      roleId?: string;
      participantIds?: string[];
    },
    user: CurrentUserData,
  ): Promise<InternalConversation> {
    // BROADCAST / ROLE_CHANNEL require ManageSupport.
    if (data.type === 'DIRECT') {
      await this.requireSupportView(eventId, user);
    } else {
      await this.requireSupportManage(eventId, user);
    }

    // Avoid duplicate DIRECT conversations between the same participants.
    // Uses deterministic participantHash for exact matching and race-condition safety.
    if (data.type === 'DIRECT' && data.participantIds?.length === 1) {
      const targetUserId = data.participantIds[0];
      const allParticipantIds: string[] = [user.id, ...(targetUserId ? [targetUserId] : [])];
      const participantHash = [...allParticipantIds].sort().join('|');

      // Fast path: hash-based lookup (unique constraint prevents duplicates)
      const byHash = await this.prisma.internalConversation.findFirst({
        where: { eventId, type: 'DIRECT', isActive: true, participantHash },
      });
      if (byHash) {
        return byHash;
      }

      // Fallback for legacy conversations without participantHash
      const existing = await this.prisma.internalConversation.findFirst({
        where: {
          eventId,
          type: 'DIRECT',
          isActive: true,
          participants: {
            every: { userId: { in: allParticipantIds } },
          },
        },
      });

      if (existing) {
        const participants = await this.prisma.internalParticipant.findMany({
          where: { conversationId: existing.id, leftAt: null },
        });
        const existingIds = participants.map((p) => p.userId);
        const isExactMatch =
          existingIds.length === allParticipantIds.length &&
          allParticipantIds.every((id) => existingIds.includes(id)) &&
          existingIds.every((id) => allParticipantIds.includes(id));
        if (isExactMatch) {
          return existing;
        }
      }
    }

    const participantIds = new Set([user.id, ...(data.participantIds ?? [])]);
    const participantHash =
      data.type === 'DIRECT' && participantIds.size > 0
        ? [...participantIds].sort().join('|')
        : undefined;

    const conversation = await this.prisma.internalConversation.create({
      data: {
        eventId,
        title: data.title,
        description: data.description,
        type: data.type,
        roleId: data.roleId,
        participantHash,
        createdBy: user.id,
        isActive: true,
      },
    });

    // Always add creator as participant
    await this.prisma.internalParticipant.createMany({
      data: Array.from(participantIds).map((userId) => ({
        conversationId: conversation.id,
        userId,
      })),
      skipDuplicates: true,
    });

    await this.kafka.send({
      topic: KafkaTopics.conversation.internalCreated,
      payload: {
        conversationId: conversation.id,
        eventId: conversation.eventId,
        title: conversation.title,
        type: conversation.type,
        createdBy: conversation.createdBy,
      } satisfies InternalConversationCreatedDTO,
      meta: {
        clazz: this.constructor.name,
        type: 'EVENT',
        service: 'internal-service',
        operation: 'Internal Conversation Created',
        version: '1',
        actorId: user.id,
        tenantId: 'omnixys',
      },
    });

    return conversation;
  }

  async sendMessage(
    conversationId: string,
    data: { body: string; priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' },
    user: CurrentUserData,
  ): Promise<InternalMessage> {
    await this.findConversationById(conversationId, user);

    if (!(await this.isParticipant(conversationId, user.id))) {
      throw new ConversationAccessDeniedException(conversationId);
    }

    const message = await this.prisma.internalMessage.create({
      data: {
        conversationId,
        senderId: user.id,
        body: data.body,
        priority: data.priority ?? 'NORMAL',
      },
    });

    await this.prisma.internalConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    const participants = await this.prisma.internalParticipant.findMany({
      where: { conversationId, leftAt: null },
      select: { userId: true },
    });

    await this.kafka.send({
      topic: KafkaTopics.conversation.internalMessage,
      payload: {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        body: message.body,
        priority: message.priority,
        createdAt: message.createdAt.toISOString(),
        participantIds: participants.map((p) => p.userId),
      } satisfies InternalMessageSentDTO,
      meta: {
        clazz: this.constructor.name,
        type: 'EVENT',
        service: 'internal-service',
        operation: 'Internal Message Sent',
        version: '1',
        actorId: user.id,
        tenantId: 'omnixys',
      },
    });

    return message;
  }

  async markAsRead(conversationId: string, user: CurrentUserData): Promise<InternalParticipant> {
    await this.findConversationById(conversationId, user);

    const participant = await this.prisma.internalParticipant.findUnique({
      where: {
        uq_internal_participant: {
          conversationId,
          userId: user.id,
        },
      },
    });

    if (!participant) {
      throw new ConversationAccessDeniedException(conversationId);
    }

    const updated = await this.prisma.internalParticipant.update({
      where: { id: participant.id },
      data: { lastReadAt: new Date() },
    });

    await this.kafka.send({
      topic: KafkaTopics.conversation.internalRead,
      payload: {
        conversationId,
        userId: user.id,
        lastReadAt: updated.lastReadAt?.toISOString() ?? '',
      } satisfies InternalReadReceiptDTO,
      meta: {
        clazz: this.constructor.name,
        type: 'EVENT',
        service: 'internal-service',
        operation: 'Internal Read Receipt',
        version: '1',
        actorId: user.id,
        tenantId: 'omnixys',
      },
    });

    return updated;
  }

  async archiveConversation(id: string, user: CurrentUserData): Promise<InternalConversation> {
    const conversation = await this.prisma.internalConversation.findUnique({
      where: { id },
    });

    if (!conversation) {
      throw new ConversationNotFoundException(id);
    }

    await this.requireSupportManage(conversation.eventId, user);

    return this.prisma.internalConversation.update({
      where: { id },
      data: {
        isActive: false,
        archivedAt: new Date(),
      },
    });
  }

  async addParticipants(
    conversationId: string,
    userIds: string[],
    user: CurrentUserData,
  ): Promise<void> {
    const conversation = await this.findConversationById(conversationId, user);
    await this.requireSupportManage(conversation.eventId, user);

    await this.prisma.internalParticipant.createMany({
      data: userIds.map((userId) => ({
        conversationId,
        userId,
      })),
      skipDuplicates: true,
    });
  }

  private async isParticipant(conversationId: string, userId: string): Promise<boolean> {
    const participant = await this.prisma.internalParticipant.findUnique({
      where: {
        uq_internal_participant: {
          conversationId,
          userId,
        },
      },
    });
    return !!participant && !participant.leftAt;
  }

  private async canAccessConversation(
    conversation: { id: string; eventId: string; type: string; createdBy: string },
    user: CurrentUserData,
  ): Promise<boolean> {
    if (conversation.type === 'BROADCAST' || conversation.type === 'ROLE_CHANNEL') {
      return this.hasEventPermission(conversation.eventId, user, EventPermissionKey.ViewSupport);
    }

    if (conversation.createdBy === user.id) {
      return true;
    }

    return this.isParticipant(conversation.id, user.id);
  }

  private async requireSupportView(eventId: string, user: CurrentUserData): Promise<void> {
    const has = await this.hasEventPermission(eventId, user, EventPermissionKey.ViewSupport);
    if (!has) {
      throw new ConversationAccessDeniedException(eventId, 'support-view-required');
    }
  }

  private async requireSupportManage(eventId: string, user: CurrentUserData): Promise<void> {
    const has = await this.hasEventPermission(eventId, user, EventPermissionKey.ManageSupport);
    if (!has) {
      throw new ConversationAccessDeniedException(eventId, 'support-manage-required');
    }
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
