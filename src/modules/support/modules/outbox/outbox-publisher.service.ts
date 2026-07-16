import { PrismaService } from '../../../../prisma/prisma.service.js';
import { Injectable, Logger } from '@nestjs/common';
import { KafkaProducerService } from '@omnixys/kafka';

@Injectable()
export class OutboxPublisherService {
  private readonly logger = new Logger(OutboxPublisherService.name);
  private isRunning = false;
  private pollTimer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly kafka: KafkaProducerService,
  ) {}

  start(pollIntervalMs = 1000): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.logger.log(`OutboxPublisher started (poll every ${pollIntervalMs}ms)`);
    this.pollTimer = setInterval(() => this.poll(), pollIntervalMs);
  }

  stop(): void {
    this.isRunning = false;

    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }

    this.logger.log('OutboxPublisher stopped');
  }

  private async poll(): Promise<void> {
    try {
      const messages = await this.prisma.outboxMessage.findMany({
        where: {
          status: 'PENDING',
          attempt: { lt: 5 },
        },
        orderBy: { createdAt: 'asc' },
        take: 50,
      });

      const batch = messages.map((msg) => ({
        topic: msg.topic,
        value: JSON.stringify(msg.payload),
        key: msg.key ?? undefined,
        headers: msg.headers as Record<string, string> | undefined,
      }));

      if (batch.length === 0) {
        return;
      }

      try {
        await this.kafka.rawSendBatch(batch);

        const ids = messages.map((msg) => msg.id);

        await this.prisma.outboxMessage.updateMany({
          where: { id: { in: ids } },
          data: {
            status: 'PUBLISHED',
            publishedAt: new Date(),
            attempt: { increment: 1 },
          },
        });
      } catch (error) {
        for (const message of messages) {
          const attempt = message.attempt + 1;

          if (attempt >= message.maxRetry) {
            await this.prisma.outboxMessage.update({
              where: { id: message.id },
              data: {
                status: 'FAILED',
                error: error instanceof Error ? error.message : String(error),
                attempt,
              },
            });
            this.logger.error(
              `Outbox message ${message.id} failed after ${attempt} attempts`,
              error,
            );
          } else {
            await this.prisma.outboxMessage.update({
              where: { id: message.id },
              data: {
                error: error instanceof Error ? error.message : String(error),
                attempt,
              },
            });
          }
        }
      }
    } catch (error) {
      this.logger.error('Outbox poll error', error);
    }
  }
}
