// src/template/models/payloads/template.payload.ts

import { JsonScalar } from '../../../core/scalars/json.scalar.js';
import { Channel } from '../../../notification/models/enums/channel.enum.js';
import { VariableSchema } from '../../../notification/utils/notification.renderer.js';
import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class TemplatePayload {
  @Field(() => ID)
  id!: string;

  @Field()
  key!: string;

  @Field(() => Channel)
  channel!: Channel;

  @Field()
  locale!: string;

  @Field({ nullable: true })
  title?: string;

  @Field()
  body!: string;

  /**
   * JSON schema describing allowed variables.
   * Example:
   * {
   *   "username": { "required": true, "type": "string" },
   *   "password": { "required": true, "type": "string", "sensitive": true }
   * }
   */
  @Field(() => JsonScalar)
  variables!: VariableSchema;

  @Field({ nullable: true })
  category?: string;

  @Field()
  isActive!: boolean;

  @Field()
  version!: number;

  @Field(() => [String])
  tags!: string[];

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}
