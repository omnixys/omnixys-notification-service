// src/template/models/mappers/template.mapper.ts

import type { Channel } from '../../../notification/models/enums/channel.enum.js';
import type { VariableSchema } from '../../../notification/utils/notification.renderer.js';
import type { Template } from '../../../prisma/generated/client.js';
import type { TemplatePayload } from '../payloads/template.payload.js';

export class TemplateMapper {
  static toPayload(entity: Template): TemplatePayload {
    return {
      id: entity.id,
      key: entity.key,
      channel: entity.channel as Channel,
      locale: entity.locale,
      title: entity.title ?? undefined,
      body: entity.body,
      variables: entity.variables as VariableSchema,
      category: entity.category ?? undefined,
      isActive: entity.isActive,
      version: entity.version,
      tags: entity.tags ?? [],
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  static toPayloadList(entities: Template[]): TemplatePayload[] {
    return entities.map((e) => this.toPayload(e));
  }
}
