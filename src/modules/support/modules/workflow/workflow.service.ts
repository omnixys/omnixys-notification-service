import { env } from '../../../../config/env.js';
import {
  ConversationAssignmentConflictException,
  ConversationAccessDeniedException,
  ConversationClosedException,
  ConversationNotFoundException,
  ConversationStateException,
} from '../../../../modules/notification/errors/notification.error.js';
import type { SupportConversation } from '../../../../prisma/generated/client.js';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { Injectable } from '@nestjs/common';
import { ValkeyLockService } from '@omnixys/cache-ts';
import {
  EventPermissionKey,
  type ConversationChatAssignedDTO,
  type ConversationChatClosedDTO,
} from '@omnixys/contracts-ts';
import { KafkaProducerService, KafkaTopics } from '@omnixys/kafka-ts';
import { getLogger } from '@omnixys/logger-ts';
import { EventPermissionResolver, type CurrentUserData } from '@omnixys/security-ts';

@Injectable()
export class WorkflowService {
  readonly #logger = getLogger(WorkflowService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly kafka: KafkaProducerService,
    private readonly lock: ValkeyLockService,
    private readonly permissionResolver: EventPermissionResolver,
  ) {}

  async assignConversation(
    conversationId: string,
    userId: string,
    actor: CurrentUserData,
  ): Promise<SupportConversation> {
    const lockKey = `support:conversation:assign:${conversationId}`;
    const token = await this.lock.acquireLock(lockKey, 3000);

    if (!token) {
      this.#logger.warn({ conversationId }, 'conversation_assign_lock_conflict');
      throw new ConversationAssignmentConflictException(conversationId);
    }

    try {
      const conversation = await this.prisma.supportConversation.findUnique({
        where: { id: conversationId },
      });

      if (!conversation) {
        throw new ConversationNotFoundException(conversationId);
      }

      await this.assertManageSupport(conversation.eventId, actor, conversationId);

      if (conversation.status === 'CLOSED') {
        throw new ConversationClosedException(conversationId);
      }

      if (conversation.assignedTo && conversation.assignedTo !== userId) {
        this.#logger.warn(
          {
            conversationId,
            assignedTo: conversation.assignedTo,
            requestedBy: actor.id,
          },
          'conversation_already_assigned',
        );
        throw new ConversationStateException(
          conversationId,
          `already-assigned-to-${conversation.assignedTo}`,
        );
      }

      const updated = await this.prisma.supportConversation.update({
        where: { id: conversationId },
        data: {
          assignedTo: userId,
          status: 'ASSIGNED',
          lastMessageAt: new Date(),
        },
      });

      await this.prisma.supportAssignmentHistory.create({
        data: {
          conversationId,
          assignedTo: userId,
          assignedBy: actor.id,
        },
      });

      this.#logger.debug(
        {
          conversationId,
          assignedTo: userId,
          assignedBy: actor.id,
        },
        'conversation_assigned',
      );

      await this.kafka.send({
        topic: KafkaTopics.conversation.chatAssigned,
        payload: {
          conversationId: updated.id,
          assignedTo: userId,
          assignedBy: actor.id,
        } satisfies ConversationChatAssignedDTO,
        meta: {
          clazz: this.constructor.name,
          type: 'EVENT',
          service: 'support-workflow',
          operation: 'Conversation Assigned',
          version: '1',
          actorId: actor.id,
          tenantId: env.DEFAULT_TENANT_ID,
        },
      });

      return updated;
    } finally {
      await this.lock.releaseLock(lockKey, token);
    }
  }

  async closeConversation(
    conversationId: string,
    actor: CurrentUserData,
  ): Promise<SupportConversation> {
    const conversation = await this.prisma.supportConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new ConversationNotFoundException(conversationId);
    }

    await this.assertManageSupport(conversation.eventId, actor, conversationId);

    if (conversation.status === 'CLOSED') {
      throw new ConversationClosedException(conversationId);
    }

    const updated = await this.prisma.supportConversation.update({
      where: { id: conversationId },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
      },
    });

    this.#logger.debug({ conversationId, closedBy: actor.id }, 'conversation_closed');

    await this.kafka.send({
      topic: KafkaTopics.conversation.chatClosed,
      payload: {
        conversationId: updated.id,
        closedBy: actor.id,
      } satisfies ConversationChatClosedDTO,
      meta: {
        clazz: this.constructor.name,
        type: 'EVENT',
        service: 'support-workflow',
        operation: 'Conversation Closed',
        version: '1',
        actorId: actor.id,
        tenantId: env.DEFAULT_TENANT_ID,
      },
    });

    return updated;
  }

  async reopenConversation(
    conversationId: string,
    actor: CurrentUserData,
  ): Promise<SupportConversation> {
    const conversation = await this.prisma.supportConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new ConversationNotFoundException(conversationId);
    }

    await this.assertManageSupport(conversation.eventId, actor, conversationId);

    if (conversation.status !== 'CLOSED') {
      this.#logger.warn(
        {
          conversationId,
          currentStatus: conversation.status,
        },
        'conversation_reopen_not_closed',
      );
      throw new ConversationStateException(conversationId, conversation.status);
    }

    const updated = await this.prisma.supportConversation.update({
      where: { id: conversationId },
      data: {
        status: conversation.assignedTo ? 'ASSIGNED' : 'OPEN',
        closedAt: null,
      },
    });

    this.#logger.debug({ conversationId, reopenedBy: actor.id }, 'conversation_reopened');

    return updated;
  }

  private async assertManageSupport(
    eventId: string,
    actor: CurrentUserData,
    conversationId: string,
  ): Promise<void> {
    const permissions = await this.permissionResolver.getPermissionsForUser(actor.id, eventId);

    if (!permissions.includes(EventPermissionKey.ManageSupport)) {
      throw new ConversationAccessDeniedException(conversationId, 'support-manage-required');
    }
  }
}
