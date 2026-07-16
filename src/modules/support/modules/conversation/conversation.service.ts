import {
  ConversationAccessDeniedException,
  ConversationDuplicateException,
  ConversationNotFoundException,
} from '../../../../modules/notification/errors/notification.error.js';
import type { Prisma, SupportConversation } from '../../../../prisma/generated/client.js';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { Injectable } from '@nestjs/common';
import { ValkeyPubSubService } from '@omnixys/cache';
import { EventPermissionKey } from '@omnixys/contracts';
import { EventPermissionResolver } from '@omnixys/security';
import type { CurrentUserData } from '@omnixys/security';

@Injectable()
export class ConversationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly valkeyPubSub: ValkeyPubSubService,
    private readonly permissionResolver: EventPermissionResolver,
  ) {}

  async findById(id: string, user: CurrentUserData): Promise<SupportConversation> {
    const conversation = await this.prisma.supportConversation.findUnique({
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

  async findByEvent(eventId: string, user: CurrentUserData): Promise<SupportConversation[]> {
    if (!(await this.hasEventPermission(eventId, user, EventPermissionKey.ViewSupport))) {
      throw new ConversationAccessDeniedException(eventId, 'support-view-required');
    }

    return this.prisma.supportConversation.findMany({
      where: { eventId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findByUser(userId: string): Promise<SupportConversation[]> {
    return this.prisma.supportConversation.findMany({
      where: { guestUserId: userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async create(
    eventId: string,
    data: {
      invitationId?: string;
      guestUserId?: string;
      guestName: string;
      guestContact?: string;
      subject?: string;
      channel: 'WHATSAPP' | 'EMAIL' | 'WEBCHAT' | 'SMS';
      priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
      firstMessage: string;
    },
  ): Promise<SupportConversation> {
    const existingByGuestAndEvent = data.guestUserId
      ? await this.prisma.supportConversation.findFirst({
          where: {
            eventId,
            guestUserId: data.guestUserId,
            status: { not: 'CLOSED' },
          },
        })
      : null;

    if (existingByGuestAndEvent) {
      throw new ConversationDuplicateException(existingByGuestAndEvent.id);
    }

    const existingByInvitation = data.invitationId
      ? await this.prisma.supportConversation.findFirst({
          where: {
            eventId,
            invitationId: data.invitationId,
            status: { not: 'CLOSED' },
          },
        })
      : null;

    if (existingByInvitation) {
      throw new ConversationDuplicateException(existingByInvitation.id);
    }

    const conversation = await this.prisma.supportConversation.create({
      data: {
        eventId,
        invitationId: data.invitationId,
        guestUserId: data.guestUserId,
        guestName: data.guestName,
        guestContact: data.guestContact,
        subject: data.subject,
        channel: data.channel,
        priority: data.priority ?? 'NORMAL',
        status: 'OPEN',
        lastMessagePreview: data.firstMessage.slice(0, 100),
        lastMessageAt: new Date(),
      },
    });

    await this.prisma.supportMessage.create({
      data: {
        conversationId: conversation.id,
        direction: 'INBOUND',
        channel: data.channel,
        fromUserId: data.guestUserId,
        fromGuest: true,
        body: data.firstMessage,
        status: 'SENT',
      },
    });

    return conversation;
  }

  async update(
    id: string,
    data: {
      subject?: string;
      priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    },
    user: CurrentUserData,
  ): Promise<SupportConversation> {
    const conversation = await this.prisma.supportConversation.findUnique({
      where: { id },
    });

    if (!conversation) {
      throw new ConversationNotFoundException(id);
    }

    if (
      !(await this.hasEventPermission(conversation.eventId, user, EventPermissionKey.ManageSupport))
    ) {
      throw new ConversationAccessDeniedException(id, 'support-manage-required');
    }

    const updateData: Prisma.SupportConversationUpdateInput = {};

    if (data.subject !== undefined) {
      updateData.subject = data.subject;
    }

    if (data.priority !== undefined) {
      updateData.priority = data.priority;
    }

    return this.prisma.supportConversation.update({
      where: { id },
      data: updateData,
    });
  }

  async countByEvent(
    eventId: string,
    user: CurrentUserData,
    status?: 'OPEN' | 'ASSIGNED' | 'CLOSED',
  ): Promise<number> {
    if (!(await this.hasEventPermission(eventId, user, EventPermissionKey.ViewSupport))) {
      throw new ConversationAccessDeniedException(eventId, 'support-view-required');
    }

    const where: Prisma.SupportConversationWhereInput = { eventId };

    if (status) {
      where.status = status;
    }

    return this.prisma.supportConversation.count({ where });
  }

  async getUnreadCountsByEvent(
    eventId: string,
    user: CurrentUserData,
  ): Promise<SupportConversation[]> {
    if (!(await this.hasEventPermission(eventId, user, EventPermissionKey.ViewSupport))) {
      throw new ConversationAccessDeniedException(eventId, 'support-view-required');
    }

    return this.prisma.supportConversation.findMany({
      where: { eventId, deletedAt: null },
      select: {
        id: true,
        eventId: true,
        invitationId: true,
        guestUserId: true,
        guestName: true,
        guestContact: true,
        subject: true,
        channel: true,
        status: true,
        priority: true,
        assignedTo: true,
        assignedToUser: true,
        unreadCount: true,
        lastMessageAt: true,
        lastMessagePreview: true,
        createdAt: true,
        updatedAt: true,
        closedAt: true,
        emailMessageId: true,
        emailInReplyTo: true,
        emailReferences: true,
        tags: true,
        metadata: true,
        slaDeadline: true,
        escalatedAt: true,
        escalatedTo: true,
        internalNote: true,
        deletedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async markAsRead(conversationId: string, user: CurrentUserData): Promise<SupportConversation> {
    const conversation = await this.prisma.supportConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new ConversationNotFoundException(conversationId);
    }

    if (!(await this.canAccessConversation(conversation, user))) {
      throw new ConversationAccessDeniedException(conversationId);
    }

    const updated = await this.prisma.supportConversation.update({
      where: { id: conversationId },
      data: { unreadCount: 0 },
    });

    try {
      await this.valkeyPubSub.publish(`unreadCount.updated.${conversationId}`, {
        conversationId,
        unreadCount: 0,
        eventId: conversation.eventId,
      });
    } catch {
      // Valkey publish failure is non-critical
    }

    return updated;
  }

  private async canAccessConversation(
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
