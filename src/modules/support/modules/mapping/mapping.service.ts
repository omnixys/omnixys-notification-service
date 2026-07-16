import type {
  ConversationChannel,
  ConversationMapping,
} from '../../../../prisma/generated/client.js';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { Injectable } from '@nestjs/common';

export interface MappingResult {
  conversationId: string | null;
  eventId: string | null;
  created: boolean;
}

@Injectable()
export class MappingService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveMapping(
    channel: ConversationChannel,
    externalId: string,
    eventId?: string,
  ): Promise<MappingResult> {
    if (eventId) {
      const mapping = await this.prisma.conversationMapping.findUnique({
        where: {
          uq_conversation_mapping: {
            channel,
            externalId,
            eventId,
          },
        },
      });
      if (mapping?.conversationId) {
        const conv = await this.prisma.supportConversation.findUnique({
          where: { id: mapping.conversationId },
        });
        if (conv && !conv.deletedAt) {
          return { conversationId: conv.id, eventId: conv.eventId, created: false };
        }
      }
    }

    const fallbackMapping = await this.prisma.conversationMapping.findFirst({
      where: {
        channel,
        externalId,
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (fallbackMapping?.conversationId) {
      const conv = await this.prisma.supportConversation.findUnique({
        where: { id: fallbackMapping.conversationId },
      });
      if (conv && !conv.deletedAt) {
        return { conversationId: conv.id, eventId: conv.eventId, created: false };
      }
    }

    return { conversationId: null, eventId: null, created: false };
  }

  async createMapping(
    channel: ConversationChannel,
    externalId: string,
    eventId: string,
    conversationId: string,
    mappingType: 'AUTO' | 'MANUAL' | 'FALLBACK' = 'AUTO',
  ): Promise<void> {
    await this.prisma.conversationMapping.upsert({
      where: {
        uq_conversation_mapping: {
          channel,
          externalId,
          eventId,
        },
      },
      create: {
        channel,
        externalId,
        eventId,
        conversationId,
        mappingType,
      },
      update: {
        conversationId,
        mappingType,
      },
    });
  }

  async findByConversation(conversationId: string): Promise<ConversationMapping[]> {
    return this.prisma.conversationMapping.findMany({
      where: { conversationId },
    });
  }
}
