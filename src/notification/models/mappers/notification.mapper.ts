import type { Notification } from '../../../prisma/generated/client.js';
import type { Channel } from '../enums/channel.enum.js';
import type { NotificationStatus } from '../enums/notification-status.enum.js';
import type { Priority } from '../enums/priority.enum.js';
import type { NotificationPayload } from '../payloads/notification.payload.js';

export class NotificationMapper {
  static toPayload(entity: Notification): NotificationPayload {
    return {
      id: entity.id,
      recipientUsername: entity.recipientUsername,
      recipientId: entity.recipientId ?? undefined,
      channel: entity.channel as Channel,
      priority: entity.priority as Priority,
      status: entity.status as NotificationStatus,
      renderedTitle: entity.renderedTitle ?? undefined,
      renderedBody: entity.renderedBody,
      linkUrl: entity.linkUrl ?? undefined,
      read: entity.read,
      createdAt: entity.createdAt,
    };
  }

  static toPayloadList(list: Notification[]): NotificationPayload[] {
    return list.map((x) => this.toPayload(x));
  }
}
