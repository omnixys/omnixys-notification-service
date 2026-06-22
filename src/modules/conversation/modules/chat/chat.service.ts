// modules/chat/chat.service.ts

import type { WhatsAppChat } from '../../../../prisma/generated/client.js';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import {
  ChatAccessDeniedException,
  ChatAssignmentConflictException,
  ChatNotFoundException,
  ChatStateException,
} from '../../../notification/errors/notification.error.js';
import { Injectable } from '@nestjs/common';
import { ValkeyLockService } from '@omnixys/cache';
import { CurrentUserData } from '@omnixys/security';
import { RealmRoleType } from '@omnixys/shared';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private lock: ValkeyLockService,
  ) {}

  async assignChat(chatId: string, userId: string, actor: CurrentUserData): Promise<WhatsAppChat> {
    const lockKey = `conversation:chat:assign:${chatId}`;
    const token = await this.lock.acquireLock(lockKey, 3000);

    if (!token) {
      throw new ChatAssignmentConflictException(chatId);
    }

    try {
      const chat = await this.prisma.whatsAppChat.findUnique({
        where: { chatId },
      });

      if (!chat) {
        throw new ChatNotFoundException(chatId);
      }

      if (chat.status === 'CLOSED') {
        throw new ChatStateException(chatId, chat.status);
      }

      if (chat.assignedTo && chat.assignedTo !== userId && actor.role !== RealmRoleType.ADMIN) {
        throw new ChatAccessDeniedException(chatId, 'assigned-to-another-user');
      }

      const updated = await this.prisma.whatsAppChat.update({
        where: { chatId },
        data: {
          assignedTo: userId,
          status: 'ASSIGNED',
          lastMessageAt: new Date(),
        },
      });

      await this.prisma.whatsAppAssignmentHistory.create({
        data: {
          chatRefId: chat.id,
          assignedTo: userId,
          assignedBy: actor.id,
        },
      });

      return updated;
    } finally {
      await this.lock.releaseLock(lockKey, token);
    }
  }

  async getChats(user: CurrentUserData): Promise<WhatsAppChat[]> {
    if (user.role === RealmRoleType.ADMIN) {
      return this.prisma.whatsAppChat.findMany({
        orderBy: { updatedAt: 'desc' },
      });
    }

    return this.prisma.whatsAppChat.findMany({
      where: {
        OR: [{ assignedTo: user.id }, { assignedTo: null }],
      },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
