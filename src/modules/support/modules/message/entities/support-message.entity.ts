import { ConversationChannel } from '../../conversation/entities/support-conversation.entity.js';
import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';

export enum MessageDirection {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
}

export enum MessageStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
}

registerEnumType(MessageDirection, { name: 'SupportMessageDirection' });
registerEnumType(MessageStatus, { name: 'SupportMessageStatus' });

@ObjectType()
export class SupportMessage {
  @Field(() => ID)
  id!: string;

  @Field()
  conversationId!: string;

  @Field(() => MessageDirection)
  direction!: MessageDirection;

  @Field(() => ConversationChannel)
  channel!: ConversationChannel;

  @Field({ nullable: true })
  fromUserId?: string;

  @Field()
  fromGuest!: boolean;

  @Field({ nullable: true })
  body?: string;

  @Field({ nullable: true })
  mediaUrl?: string;

  @Field({ nullable: true })
  mimeType?: string;

  @Field(() => MessageStatus)
  status!: MessageStatus;

  @Field({ nullable: true })
  externalId?: string;

  @Field({ nullable: true })
  deliveredAt?: Date;

  @Field({ nullable: true })
  readAt?: Date;

  @Field()
  createdAt!: Date;
}
