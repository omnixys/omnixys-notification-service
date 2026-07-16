import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class QuickReply {
  @Field(() => ID)
  id!: string;

  @Field()
  key!: string;

  @Field()
  body!: string;

  @Field({ nullable: true })
  channel?: string;

  @Field(() => [String])
  tags!: string[];

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}
