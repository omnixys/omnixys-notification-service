import type { Prisma } from '../../../../prisma/generated/client.js';
import { Injectable } from '@nestjs/common';
import { ContextAccessor } from '@omnixys/context-ts';
import {
  AnalyticsDomainFactSchema,
  type AnalyticsDomainFact,
} from '@omnixys/contracts-ts/analytics';
import { isUUID } from 'class-validator';
import { randomUUID } from 'node:crypto';

@Injectable()
export class AnalyticsOutboxService {
  enqueue(
    tx: Prisma.TransactionClient,
    topic: string,
    fact: Omit<AnalyticsDomainFact, 'producer' | 'occurredAt'>,
  ): Promise<unknown> {
    const context = ContextAccessor.get();
    const tenantId = context?.tenant?.verified ? context.tenant.tenantId : undefined;
    if (!tenantId || !isUUID(tenantId)) {
      throw new Error('Verified UUID tenant context is required for analytics facts');
    }

    const id = randomUUID();
    const domainFact = AnalyticsDomainFactSchema.parse({
      producer: 'notification',
      occurredAt: new Date().toISOString(),
      ...fact,
    });
    const payload = JSON.parse(
      JSON.stringify({
        eventId: id,
        eventName: topic,
        eventType: 'EVENT',
        eventVersion: '1',
        service: 'notification',
        timestamp: domainFact.occurredAt,
        payload: domainFact,
      }),
    ) as Prisma.InputJsonValue;

    return tx.outboxMessage.create({
      data: {
        id,
        topic,
        key: fact.aggregateId,
        payload,
        headers: {
          'x-tenant-id': tenantId,
          ...(context?.correlationId ? { 'x-correlation-id': context.correlationId } : {}),
          ...(context?.principal?.actorId ? { 'x-actor-id': context.principal.actorId } : {}),
        },
      },
    });
  }
}
