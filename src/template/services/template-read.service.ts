/* eslint-disable @typescript-eslint/explicit-function-return-type */

import { LoggerPlus } from '../../logger/logger-plus.js';
import { LoggerPlusService } from '../../logger/logger-plus.service.js';
import { Channel, toPrismaModelChannel } from '../../notification/models/enums/channel.enum.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { TemplateMapper } from '../models/mappers/template.mapper.js';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class TemplateReadService {
  private readonly logger: LoggerPlus;

  constructor(
    private readonly prisma: PrismaService,
    loggerService: LoggerPlusService,
  ) {
    this.logger = loggerService.getLogger(TemplateReadService.name);
  }

  async findById(id: string) {
    this.logger.debug('findById: id=%s', id);

    const template = await this.prisma.template.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return TemplateMapper.toPayload(template);
  }

  /**
   * Runtime-safe lookup.
   * Returns the latest active template for key + channel + locale.
   */
  async findActiveByKey(key: string, channel: Channel, locale = 'de-DE') {
    this.logger.debug('findActiveByKey: key=%s channel=%s locale=%s', key, channel, locale);

    const prismaChannel = toPrismaModelChannel(channel);
    const template = await this.prisma.template.findFirst({
      where: {
        key,
        channel: prismaChannel,
        locale,
        isActive: true,
      },
      orderBy: { version: 'desc' },
    });

    if (!template) {
      throw new NotFoundException(`Active template not found for key=${key}`);
    }

    return TemplateMapper.toPayload(template);
  }

  /**
   * Admin/UI search.
   * Returns all matching templates (all versions).
   */
  async findForAdmin(search?: string, limit = 50) {
    const templates = await this.prisma.template.findMany({
      where: search
        ? {
            OR: [
              { key: { contains: search, mode: 'insensitive' } },
              { title: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {},
      take: Math.min(limit, 100),
      orderBy: [{ updatedAt: 'desc' }, { version: 'desc' }],
    });

    return TemplateMapper.toPayloadList(templates);
  }

  async findInvitationTemplates() {
    const templates = await this.prisma.template.findMany({
      where: {
        isActive: true,
        channel: {
          in: [Channel.EMAIL, Channel.WHATSAPP],
        },
      },
      orderBy: [{ key: 'asc' }, { version: 'desc' }],
    });

    return TemplateMapper.toPayloadList(templates);
  }
}
