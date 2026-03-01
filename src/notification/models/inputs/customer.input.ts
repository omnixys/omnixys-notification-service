import { ContactOptionsType } from '../enums/contact-options-type.enum.js';
import { InterestType } from '../enums/interest-type.enum.js';
import { StatusType } from '../enums/status-type.enum.js';
import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean, IsEnum, IsInt } from 'class-validator';

@InputType()
export class CustomerInput {
  @Field(() => Number)
  @IsInt()
  tierLevel!: number;

  @Field(() => Boolean)
  @IsBoolean()
  subscribed!: boolean;

  @Field(() => StatusType, { defaultValue: StatusType.ACTIVE, nullable: true })
  @IsEnum(StatusType)
  state?: StatusType;

  @Field(() => [InterestType])
  interests!: InterestType[];

  @Field(() => [ContactOptionsType])
  contactOptions!: ContactOptionsType[];
}
