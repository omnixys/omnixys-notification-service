/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Args, Int, Query, Resolver } from '@nestjs/graphql';

import { LoggerPlus } from '../../logger/logger-plus.js';
import { LoggerPlusService } from '../../logger/logger-plus.service.js';

import { Channel } from '../../notification/models/enums/channel.enum.js';
import { TemplatePayload } from '../models/payloads/template.payload.js';
import { TemplateReadService } from '../services/template-read.service.js';

// Optional: Admin guard
// import { RolesGuard } from '../../auth/guards/roles.guard';
// import { Roles } from '../../auth/decorators/roles.decorator';

@Resolver()
export class TemplateQueryResolver {
  private readonly logger: LoggerPlus;

  constructor(
    loggerService: LoggerPlusService,
    private readonly templateReadService: TemplateReadService,
  ) {
    this.logger = loggerService.getLogger(TemplateQueryResolver.name);
  }

  /**
   * Admin query – list/search templates (all versions).
   */
  // @UseGuards(RolesGuard)
  // @Roles('ADMIN')
  @Query(() => [TemplatePayload])
  async templates(
    @Args('search', { type: () => String, nullable: true })
    search?: string,

    @Args('limit', { type: () => Int, nullable: true })
    limit?: number,
  ): Promise<TemplatePayload[]> {
    this.logger.debug('templates: search=%s limit=%d', search, limit);

    return this.templateReadService.findForAdmin(search, limit ?? 50);
  }

  /**
   * Runtime-safe query.
   * Returns the latest active template for key + channel + locale.
   */
  @Query(() => TemplatePayload)
  async activeTemplate(
    @Args('key') key: string,
    @Args('channel', { type: () => String }) channel: Channel,
    @Args('locale', { nullable: true }) locale?: string,
  ): Promise<TemplatePayload> {
    return this.templateReadService.findActiveByKey(
      key,
      channel,
      locale ?? 'de-DE',
    );
  }

  @Query(() => [TemplatePayload], {
    description: 'Returns active invitation templates (EMAIL / WHATSAPP)',
  })
  async invitationTemplates(): Promise<TemplatePayload[]> {
    return this.templateReadService.findInvitationTemplates();
  }
}
