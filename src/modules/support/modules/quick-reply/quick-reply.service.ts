import {
  QuickReplyDuplicateException,
  QuickReplyNotFoundException,
} from '../../../../modules/notification/errors/notification.error.js';
import type {
  ConversationChannel,
  SupportQuickReply,
} from '../../../../prisma/generated/client.js';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { Injectable } from '@nestjs/common';
import { getLogger } from '@omnixys/logger';

@Injectable()
export class QuickReplyService {
  readonly #logger = getLogger(QuickReplyService.name);
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<SupportQuickReply[]> {
    return this.prisma.supportQuickReply.findMany({
      orderBy: { key: 'asc' },
    });
  }

  async findById(id: string): Promise<SupportQuickReply> {
    const reply = await this.prisma.supportQuickReply.findUnique({
      where: { id },
    });

    if (!reply) {
      throw new QuickReplyNotFoundException(id);
    }

    return reply;
  }

  async findByKey(key: string): Promise<SupportQuickReply> {
    const reply = await this.prisma.supportQuickReply.findUnique({
      where: { key },
    });

    if (!reply) {
      throw new QuickReplyNotFoundException(key);
    }

    return reply;
  }

  async create(data: {
    key: string;
    body: string;
    channel?: string | null;
    tags?: string[];
  }): Promise<SupportQuickReply> {
    const existing = await this.prisma.supportQuickReply.findUnique({
      where: { key: data.key },
    });

    if (existing) {
      throw new QuickReplyDuplicateException(data.key);
    }

    return this.prisma.supportQuickReply.create({
      data: {
        key: data.key,
        body: data.body,
        channel: (data.channel ?? null) as ConversationChannel | null,
        tags: data.tags ?? [],
      },
    });
  }

  async update(
    id: string,
    data: {
      key?: string;
      body?: string;
      channel?: string | null;
      tags?: string[];
    },
  ): Promise<SupportQuickReply> {
    await this.findById(id);

    if (data.key !== undefined) {
      const existing = await this.prisma.supportQuickReply.findUnique({
        where: { key: data.key },
      });

      if (existing && existing.id !== id) {
        throw new QuickReplyDuplicateException(data.key);
      }
    }

    const updateData: Record<string, unknown> = {};

    if (data.key !== undefined) {
      updateData.key = data.key;
    }

    if (data.body !== undefined) {
      updateData.body = data.body;
    }

    if (data.channel !== undefined) {
      updateData.channel = data.channel ?? null;
    }

    if (data.tags !== undefined) {
      updateData.tags = data.tags;
    }

    return this.prisma.supportQuickReply.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: string): Promise<SupportQuickReply> {
    await this.findById(id);

    return this.prisma.supportQuickReply.delete({
      where: { id },
    });
  }
}
