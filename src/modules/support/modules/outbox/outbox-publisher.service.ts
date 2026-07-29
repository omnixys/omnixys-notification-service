import { PrismaService } from '../../../../prisma/prisma.service.js';
import {
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { KafkaProducerService } from '@omnixys/kafka';
import { OmnixysLogger, type ScopedLogger } from '@omnixys/logger';
import { randomUUID } from 'node:crypto';

@Injectable()
export class OutboxPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger: ScopedLogger;
  private readonly instanceId = randomUUID();
  private isRunning = false;
  private pollTimer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly kafka: KafkaProducerService,
    omnixysLogger: OmnixysLogger,
  ) {
    this.logger = omnixysLogger.log(OutboxPublisherService.name);
  }

  onModuleInit(): void {
    this.start();
  }

  onModuleDestroy(): void {
    this.stop();
  }

  start(pollIntervalMs = 1000): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.logger.info(`OutboxPublisher started (poll every ${pollIntervalMs}ms)`);
    this.pollTimer = setInterval(() => this.poll(), pollIntervalMs);
  }

  stop(): void {
    this.isRunning = false;

    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }

    this.logger.info('OutboxPublisher stopped');
  }

  private async poll(): Promise<void> {
    try {
      const messages = await this.prisma.outboxMessage.findMany({
        where: {
          status: 'PENDING',
          deadLetteredAt: null,
          nextAttemptAt: { lte: new Date() },
          OR: [
            { lockedAt: null },
            { lockedAt: { lt: new Date(Date.now() - 60_000) } },
          ],
        },
        orderBy: { createdAt: 'asc' },
        take: 50,
      });

      for (const message of messages) {
        const claimed = await this.prisma.outboxMessage.updateMany({
          where: {
            id: message.id,
            status: 'PENDING',
            deadLetteredAt: null,
            OR: [
              { lockedAt: null },
              { lockedAt: { lt: new Date(Date.now() - 60_000) } },
            ],
          },
          data: { lockedAt: new Date(), lockedBy: this.instanceId },
        });
        if (claimed.count === 1) {
          await this.publish(message.id);
        }
      }
    } catch (error) {
      this.logger.error('Outbox poll error', error);
    }
  }

  private async publish(id: string): Promise<void> {
    const message = await this.prisma.outboxMessage.findUniqueOrThrow({
      where: { id },
    });
    try {
      await this.kafka.rawSendBatch([
        {
          topic: message.topic,
          value: JSON.stringify(message.payload),
          key: message.key ?? undefined,
          headers:
            (message.headers as Record<string, string> | null) ?? undefined,
        },
      ]);
      await this.prisma.outboxMessage.update({
        where: { id },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
          attempt: { increment: 1 },
          lockedAt: null,
          lockedBy: null,
          error: null,
        },
      });
    } catch (error) {
      const attempt = message.attempt + 1;
      const deadLettered = attempt >= message.maxRetry;
      await this.prisma.outboxMessage.update({
        where: { id },
        data: {
          status: deadLettered ? 'FAILED' : 'PENDING',
          error: error instanceof Error ? error.message : String(error),
          attempt,
          lockedAt: null,
          lockedBy: null,
          ...(deadLettered
            ? { deadLetteredAt: new Date() }
            : {
                nextAttemptAt: new Date(
                  Date.now() + Math.min(300_000, 2 ** attempt * 1_000),
                ),
              }),
        },
      });
      if (deadLettered) {
        this.logger.error(
          `Outbox message ${message.id} failed after ${attempt} attempts`,
          error,
        );
      }
    }
  }
}
