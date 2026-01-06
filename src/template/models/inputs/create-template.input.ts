/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Channel } from '../../../notification/models/enums/channel.enum.js';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateTemplateInput {
  @Field() key!: string;
  @Field() title!: string;
  @Field() body!: string;
  @Field(() => [String]) variables!: string[];
  @Field({ nullable: true }) locale?: string;
  @Field(() => Channel, { defaultValue: Channel.IN_APP }) channel?: Channel;
  @Field({ nullable: true }) category?: string;
  @Field({ defaultValue: true }) isActive?: boolean;
  @Field(() => [String], { nullable: true }) tags?: string[];
}
