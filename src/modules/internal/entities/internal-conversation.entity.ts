import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';

export enum InternalConversationType {
  BROADCAST = 'BROADCAST',
  DIRECT = 'DIRECT',
  ROLE_CHANNEL = 'ROLE_CHANNEL',
}

export enum InternalMessagePriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

registerEnumType(InternalConversationType, {
  name: 'InternalConversationType',
});
registerEnumType(InternalMessagePriority, { name: 'InternalMessagePriority' });

@ObjectType()
export class InternalConversation {
  @Field(() => ID)
  id!: string;

  @Field()
  eventId!: string;

  @Field()
  title!: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => InternalConversationType)
  type!: InternalConversationType;

  @Field({ nullable: true })
  roleId?: string;

  @Field()
  createdBy!: string;

  @Field()
  isActive!: boolean;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;

  @Field({ nullable: true })
  archivedAt?: Date;

  @Field(() => [InternalParticipant], { nullable: true })
  participants?: InternalParticipant[];
}

@ObjectType()
export class InternalMessage {
  @Field(() => ID)
  id!: string;

  @Field()
  conversationId!: string;

  @Field()
  senderId!: string;

  @Field()
  body!: string;

  @Field(() => InternalMessagePriority)
  priority!: InternalMessagePriority;

  @Field()
  createdAt!: Date;

  @Field({ nullable: true })
  editedAt?: Date;
}

@ObjectType()
export class InternalParticipant {
  @Field(() => ID)
  id!: string;

  @Field()
  conversationId!: string;

  @Field()
  userId!: string;

  @Field({ nullable: true })
  lastReadAt?: Date;

  @Field()
  joinedAt!: Date;

  @Field({ nullable: true })
  leftAt?: Date;
}
