import { Channel as PrismaChannel } from '../../prisma/generated/client.js';
import { Channel } from '../models/enums/channel.enum.js';

import { TemplateReadService } from '../../template/services/template-read.service.js';
import { NotificationRenderer, VariableSchema } from '../utils/notification.renderer.js';
import { Injectable, InternalServerErrorException } from '@nestjs/common';

interface RenderTemplateInput {
  templateKey: string;
  channel: Channel | PrismaChannel;
  locale?: string;
  variables?: Record<string, unknown>;
}

interface RenderResult {
  templateId: string;
  version: number;
  renderedTitle?: string;
  renderedBody: string;
}

@Injectable()
export class TemplateRenderService {
  constructor(
    private readonly templateReadService: TemplateReadService,
    private readonly renderer: NotificationRenderer,
  ) {}

  async renderFromKey(input: RenderTemplateInput): Promise<RenderResult> {
    const { template, version } = await this.templateReadService.findActiveByKey(
      input.templateKey,
      input.channel,
      input.locale ?? 'de-DE',
    );

    if (!version) {
      throw new InternalServerErrorException(
        `Active template version missing for key=${input.templateKey}`,
      );
    }

    const variables = input.variables ?? {};

    // 1️⃣ Validate against TemplateVersion schema
    this.renderer.validate((version.variables as VariableSchema) ?? {}, variables);

    // 2️⃣ Render
    const rendered = this.renderer.render(
      {
        title: version.subject ?? undefined,
        body: version.body,
      },
      variables,
    );

    return {
      templateId: template.id,
      version: version.version,
      renderedTitle: rendered.title,
      renderedBody: rendered.body,
    };
  }
}
