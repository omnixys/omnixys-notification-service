import { Field, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';

export enum ConversationChannel {
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
  WEBCHAT = 'WEBCHAT',
  SMS = 'SMS',
}

export enum ConversationStatus {
  OPEN = 'OPEN',
  ASSIGNED = 'ASSIGNED',
  CLOSED = 'CLOSED',
}

export enum ConversationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

registerEnumType(ConversationChannel, { name: 'ConversationChannel' });
registerEnumType(ConversationStatus, { name: 'ConversationStatus' });
registerEnumType(ConversationPriority, { name: 'ConversationPriority' });

@ObjectType()
export class SupportConversation {
  @Field(() => ID)
  id!: string;

  @Field()
  eventId!: string;

  @Field({ nullable: true })
  invitationId?: string;

  @Field({ nullable: true })
  guestUserId?: string;

  @Field()
  guestName!: string;

  @Field({ nullable: true })
  guestContact?: string;

  @Field({ nullable: true })
  subject?: string;

  @Field(() => ConversationStatus)
  status!: ConversationStatus;

  @Field(() => ConversationPriority)
  priority!: ConversationPriority;

  @Field({ nullable: true })
  assignedTo?: string;

  @Field(() => ConversationChannel)
  channel!: ConversationChannel;

  @Field({ nullable: true })
  lastMessageAt?: Date;

  @Field(() => Int, { nullable: true })
  unreadCount?: number;

  @Field(() => Int, { nullable: true })
  guestUnreadCount?: number;

  @Field({ nullable: true })
  lastMessagePreview?: string;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;

  @Field({ nullable: true })
  closedAt?: Date;
}
