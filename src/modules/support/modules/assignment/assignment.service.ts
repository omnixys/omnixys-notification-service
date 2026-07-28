import { ConversationNotFoundException } from '../../../../modules/notification/errors/notification.error.js';
import { ConversationAccessDeniedException } from '../../../../modules/notification/errors/notification.error.js';
import type {
  SupportAssignmentHistory,
  SupportConversation,
} from '../../../../prisma/generated/client.js';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { Injectable } from '@nestjs/common';
import { EventPermissionKey } from '@omnixys/contracts';
import { getLogger } from '@omnixys/logger';
import { EventPermissionResolver } from '@omnixys/security';
import type { CurrentUserData } from '@omnixys/security';

@Injectable()
export class AssignmentService {
  readonly #logger = getLogger(AssignmentService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionResolver: EventPermissionResolver,
  ) {}

  async getQueue(eventId: string, user: CurrentUserData): Promise<SupportConversation[]> {
    if (!(await this.hasEventPermission(eventId, user, EventPermissionKey.ViewSupport))) {
      throw new ConversationAccessDeniedException(eventId, 'support-view-required');
    }

    const conversations = await this.prisma.supportConversation.findMany({
      where: {
        eventId,
        status: { in: ['OPEN', 'ASSIGNED'] },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    return conversations;
  }

  async getUnassigned(eventId: string, user: CurrentUserData): Promise<SupportConversation[]> {
    if (!(await this.hasEventPermission(eventId, user, EventPermissionKey.ViewSupport))) {
      throw new ConversationAccessDeniedException(eventId, 'support-view-required');
    }

    return this.prisma.supportConversation.findMany({
      where: {
        eventId,
        status: 'OPEN',
        assignedTo: null,
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async getAssignedToMe(
    eventId: string,
    userId: string,
    user: CurrentUserData,
  ): Promise<SupportConversation[]> {
    if (!(await this.hasEventPermission(eventId, user, EventPermissionKey.ViewSupport))) {
      throw new ConversationAccessDeniedException(eventId, 'support-view-required');
    }

    if (
      user.id !== userId &&
      !(await this.hasEventPermission(eventId, user, EventPermissionKey.ManageSupport))
    ) {
      return [];
    }

    return this.prisma.supportConversation.findMany({
      where: {
        eventId,
        assignedTo: userId,
        status: { not: 'CLOSED' },
      },
      orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async getAssignmentHistory(
    conversationId: string,
    user: CurrentUserData,
  ): Promise<SupportAssignmentHistory[]> {
    const conversation = await this.prisma.supportConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new ConversationNotFoundException(conversationId);
    }

    const isEventSupport = await this.hasEventPermission(
      conversation.eventId,
      user,
      EventPermissionKey.ViewSupport,
    );

    if (!isEventSupport && conversation.guestUserId !== user.id) {
      return [];
    }

    return this.prisma.supportAssignmentHistory.findMany({
      where: { conversationId },
      orderBy: { assignedAt: 'asc' },
    });
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
