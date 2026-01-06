/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Channel } from '../../../notification/models/enums/channel.enum.js';
import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateTemplateInput {
  @Field(() => ID) id!: string;
  @Field({ nullable: true }) title?: string;
  @Field({ nullable: true }) body?: string;
  @Field(() => [String], { nullable: true }) variables?: string[];
  @Field({ nullable: true }) locale?: string;
  @Field(() => Channel, { nullable: true }) channel?: Channel;
  @Field({ nullable: true }) category?: string;
  @Field({ nullable: true }) isActive?: boolean;
  @Field(() => [String], { nullable: true }) tags?: string[];
  @Field({ defaultValue: false }) bumpVersion?: boolean;
}
