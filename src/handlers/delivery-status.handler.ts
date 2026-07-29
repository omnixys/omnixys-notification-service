import { PrismaService } from '../prisma/prisma.service.js';
import { AnalyticsOutboxService } from '../modules/support/modules/outbox/analytics-outbox.service.js';
import { Injectable } from '@nestjs/common';
import type { DeliveryStatusDTO } from '@omnixys/contracts';
import { KafkaEvent, KafkaEventHandler, KafkaTopics } from '@omnixys/kafka';
import { OmnixysLogger } from '@omnixys/logger';

const VALID_TRANSITIONS: Record<string, string[]> = {
  QUEUED: ['SENT', 'FAILED'],
  SENT: ['DELIVERED', 'FAILED'],
  DELIVERED: ['READ', 'FAILED'],
  READ: [],
  FAILED: [],
};

@KafkaEventHandler('DeliveryStatus')
@Injectable()
export class DeliveryStatusHandler {
  private readonly log;

  constructor(
    private readonly prisma: PrismaService,
    readonly omnixysLogger: OmnixysLogger,
    private readonly analyticsOutbox: AnalyticsOutboxService,
  ) {
    this.log = omnixysLogger.log(this.constructor.name);
  }

  @KafkaEvent(KafkaTopics.gateway.deliveryStatus)
  async handleDeliveryStatus(payload: DeliveryStatusDTO): Promise<void> {
    const { messageId, status, error } = payload;

    if (!messageId) {
      this.log.warn('Delivery status event missing messageId, skipping');
      return;
    }

    const notification = await this.prisma.notification.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        status: true,
        providerRef: true,
        deliveredAt: true,
        readAt: true,
      },
    });
    if (notification) {
      const current = notification.status;
      const duplicate =
        current === status ||
        (current === 'DELIVERED' &&
          status === 'READ' &&
          Boolean(notification.readAt));
      if (duplicate) {
        return;
      }
      const allowed: Record<string, string[]> = {
        PENDING: ['SENT', 'FAILED'],
        PROCESSING: ['SENT', 'FAILED'],
        SENT: ['DELIVERED', 'FAILED'],
        DELIVERED: notification.readAt ? [] : ['READ'],
        FAILED: [],
        CANCELLED: [],
        EXPIRED: [],
        ARCHIVED: [],
      };
      if (!(allowed[current] ?? []).includes(status)) {
        this.log.warn(
          `Invalid notification delivery transition: ${current} → ${status} for ${messageId}`,
        );
        return;
      }
      const data = {
        status:
          status === 'FAILED'
            ? ('FAILED' as const)
            : status === 'DELIVERED' || status === 'READ'
              ? ('DELIVERED' as const)
              : ('SENT' as const),
        providerRef: payload.providerMessageId ?? notification.providerRef,
        deliveredAt:
          status === 'DELIVERED'
            ? new Date()
            : status === 'READ'
              ? notification.deliveredAt
              : undefined,
        readAt: status === 'READ' ? new Date() : undefined,
      };
      await this.prisma.$transaction(async (tx) => {
        await tx.notification.update({ where: { id: messageId }, data });
        if (status === 'DELIVERED' || status === 'FAILED') {
          await this.analyticsOutbox.enqueue(
            tx,
            status === 'DELIVERED'
              ? 'notification.delivered.v1'
              : 'notification.failed.v1',
            {
              eventName:
                status === 'DELIVERED'
                  ? 'NotificationDelivered'
                  : 'NotificationFailed',
              aggregateId: messageId,
              aggregateType: 'Notification',
              properties: {
                notificationId: messageId,
                status,
              },
            },
          );
        }
      });
      return;
    }

    const existing = await this.prisma.messageDelivery.findUnique({
      where: { id: messageId },
      select: { id: true, status: true, providerRef: true },
    });

    if (!existing) {
      this.log.warn(
        `MessageDelivery not found for delivery status: ${messageId}`,
      );
      return;
    }

    if (existing.status === status) {
      this.log.debug(
        `Duplicate delivery status ignored: ${messageId} status=${status}`,
      );
      return;
    }

    const allowed = VALID_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(status)) {
      this.log.warn(
        `Invalid delivery status transition: ${existing.status} → ${status} for ${messageId}`,
      );
      return;
    }

    const data: Record<string, unknown> = {
      status,
      error: error ?? null,
      deliveredAt: status === 'DELIVERED' ? new Date() : undefined,
      readAt: status === 'READ' ? new Date() : undefined,
    };

    if (payload.providerMessageId && !existing.providerRef) {
      data.providerRef = payload.providerMessageId;
    }

    await this.prisma.messageDelivery.update({
      where: { id: messageId },
      data,
    });

    this.log.info(
      `Delivery status updated: ${messageId} ${existing.status} → ${status}`,
    );
  }
}
