/* eslint-disable @typescript-eslint/no-unsafe-return */
// src/notification/graphql/payloads/notification.payload.ts

import { Channel } from '../enums/channel.enum.js';
import { NotificationStatus } from '../enums/notification-status.enum.js';
import { Priority } from '../enums/priority.enum.js';
import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class NotificationPagePayload {
  @Field(() => [NotificationPayload])
  items!: NotificationPayload[];

  @Field(() => String)
  nextCursor?: string;
}

@ObjectType()
export class NotificationPayload {
  @Field(() => ID)
  id!: string;

  @Field()
  recipientUsername!: string;

  @Field({ nullable: true })
  recipientId?: string;

  @Field(() => Channel)
  channel!: Channel;

  @Field(() => Priority)
  priority!: Priority;

  @Field(() => NotificationStatus)
  status!: NotificationStatus;

  @Field({ nullable: true })
  renderedTitle?: string;

  @Field()
  renderedBody!: string;

  @Field({ nullable: true })
  linkUrl?: string;

  @Field()
  read!: boolean;

  @Field()
  createdAt!: Date;
}
