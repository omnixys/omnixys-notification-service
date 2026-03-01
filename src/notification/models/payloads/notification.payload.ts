// src/notification/models/payloads/notification.payload.ts

import { JsonScalar } from '../../../core/scalars/json.scalar.js';
import { Channel } from '../enums/channel.enum.js';
import { NotificationStatus } from '../enums/notification-status.enum.js';
import { Priority } from '../enums/priority.enum.js';
import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class NotificationPayload {
  @Field(() => ID)
  id!: string;

  @Field({ nullable: true })
  tenantId?: string;

  @Field()
  recipientUsername!: string;

  @Field({ nullable: true })
  recipientId?: string;

  @Field({ nullable: true })
  recipientAddress?: string;

  @Field(() => Channel)
  channel!: Channel;

  @Field(() => Priority)
  priority!: Priority;

  @Field(() => NotificationStatus)
  status!: NotificationStatus;

  @Field(() => JsonScalar)
  variables!: Record<string, unknown>;

  @Field(() => JsonScalar)
  metadata!: Record<string, unknown>;

  @Field()
  sensitive!: boolean;

  @Field({ nullable: true })
  readAt?: Date;

  @Field({ nullable: true })
  deliveredAt?: Date;

  @Field({ nullable: true })
  expiresAt?: Date;

  @Field({ nullable: true })
  archivedAt?: Date;

  @Field({ nullable: true })
  purgedAt?: Date;

  @Field({ nullable: true })
  createdBy?: string;

  @Field({ nullable: true })
  provider?: string;

  @Field({ nullable: true })
  providerRef?: string;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}
