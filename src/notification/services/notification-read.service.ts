import { Injectable, NotFoundException } from '@nestjs/common';

import { LoggerPlus } from '../../logger/logger-plus.js';
import { LoggerPlusService } from '../../logger/logger-plus.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

import { ListAllNotificationsInput, ListNotificationsInput } from '../models/inputs/inputs.js';

import { Prisma } from '../../prisma/generated/client.js';
import { NotificationMapper } from '../models/mappers/notification.mapper.js';
import {
  NotificationPagePayload,
  NotificationPayload,
} from '../models/payloads/notification.payload.js';

@Injectable()
export class NotificationReadService {
  private readonly logger: LoggerPlus;

  constructor(
    private readonly prisma: PrismaService,
    loggerService: LoggerPlusService,
  ) {
    this.logger = loggerService.getLogger(NotificationReadService.name);
  }

  async findById(id: string): Promise<NotificationPayload> {
    this.logger.debug('findById: id=%s', id);

    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return NotificationMapper.toPayload(notification);
  }

  async findByUser(userId: string): Promise<NotificationPayload[]> {
    this.logger.debug('findByUser: userId=%s', userId);

    const notifications = await this.prisma.notification.findMany({
      where: { recipientId: userId },
      orderBy: { createdAt: 'desc' },
    });

    return NotificationMapper.toPayloadList(notifications);
  }

  async findConnection(input: ListAllNotificationsInput): Promise<NotificationPagePayload> {
    const take = Math.min(Math.max(input.limit ?? 50, 1), 200);

    const where: Prisma.NotificationWhereInput = {
      ...(input.category ? { category: input.category } : {}),
      ...(input.includeRead === false ? { read: false } : {}),
    };

    const notifications = await this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    });

    const nextCursor =
      notifications.length === take
        ? (notifications[notifications.length - 1]?.id ?? undefined)
        : undefined;

    return {
      items: NotificationMapper.toPayloadList(notifications),
      nextCursor,
    };
  }

  async findConnectionForUser(input: ListNotificationsInput): Promise<NotificationPagePayload> {
    const take = Math.min(input.limit ?? 20, 100);

    const where: Prisma.NotificationWhereInput = {
      recipientUsername: input.recipientUsername,
      ...(input.includeRead ? {} : { read: false }),
      ...(input.category ? { category: input.category } : {}),
    };

    const notifications = await this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    });

    const nextCursor =
      notifications.length === take
        ? (notifications[notifications.length - 1]?.id ?? undefined)
        : undefined;

    return {
      items: NotificationMapper.toPayloadList(notifications),
      nextCursor,
    };
  }
}
