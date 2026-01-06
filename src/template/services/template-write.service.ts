/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { LoggerPlus } from '../../logger/logger-plus.js';
import { LoggerPlusService } from '../../logger/logger-plus.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { TemplateReadService } from './template-read.service.js';
import { Injectable, BadRequestException } from '@nestjs/common';

import { Channel, toPrismaModelChannel } from '../../notification/models/enums/channel.enum.js';
import { safeJson } from '../../utils/safe-json.js';
import { CreateTemplateInput } from '../models/inputs/create-template.input.js';
import { UpdateTemplateInput } from '../models/inputs/update-template.input.js';

@Injectable()
export class TemplateWriteService {
  private readonly logger: LoggerPlus;

  constructor(
    private readonly prisma: PrismaService,
    loggerService: LoggerPlusService,
    private readonly templateReadService: TemplateReadService,
  ) {
    this.logger = loggerService.getLogger(TemplateWriteService.name);
  }

  async create(input: CreateTemplateInput) {
    this.logger.debug('create template: %o', input);

    const prismaChannel = toPrismaModelChannel(input.channel);
    const existing = await this.prisma.template.findFirst({
      where: {
        key: input.key,
        channel: prismaChannel ?? Channel.IN_APP,
        locale: input.locale ?? 'de-DE',
        version: 1,
      },
    });

    if (existing) {
      throw new BadRequestException('Template with same key/channel/locale already exists');
    }

    return this.prisma.template.create({
      data: {
        key: input.key,
        title: input.title,
        body: input.body,
        variables: input.variables,
        locale: input.locale ?? 'de-DE',
        channel: prismaChannel ?? Channel.IN_APP,
        category: input.category ?? null,
        isActive: input.isActive ?? true,
        tags: input.tags ?? [],
        version: 1,
      },
    });
  }

  async update(input: UpdateTemplateInput) {
    const template = await this.templateReadService.findById(input.id);

    this.logger.debug('update template id=%s bumpVersion=%s', input.id, input.bumpVersion);

    let prismaChannel = toPrismaModelChannel(input.channel);
    // ── CASE 1: Simple update (no version bump)
    if (!input.bumpVersion) {
      return this.prisma.template.update({
        where: { id: template.id },
        data: {
          title: input.title ?? undefined,
          body: input.body ?? undefined,
          variables: input.variables ?? undefined,
          locale: input.locale ?? undefined,
          channel: prismaChannel,
          category: input.category ?? undefined,
          isActive: input.isActive ?? undefined,
          tags: input.tags ?? undefined,
        },
      });
    }

    // ── CASE 2: Version bump → create new row
    await this.prisma.template.update({
      where: { id: template.id },
      data: { isActive: false },
    });

    prismaChannel = toPrismaModelChannel(input.channel ?? template.channel);

    return this.prisma.template.create({
      data: {
        key: template.key,
        title: input.title ?? template.title,
        body: input.body ?? template.body,
        variables: safeJson(input.variables ?? template.variables),
        locale: input.locale ?? template.locale,
        channel: prismaChannel,
        category: input.category ?? template.category,
        isActive: input.isActive ?? true,
        tags: input.tags ?? template.tags,
        version: template.version + 1,
      },
    });
  }
}
