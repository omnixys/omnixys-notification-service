import { PhoneNumberType } from '../enums/phone-number-type.enum.js';
import { Field, ID, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString, Length, Matches } from 'class-validator';

export const PHONE_RE = /^\+?[0-9 .\-()]{6,20}$/;

@InputType()
export class PhoneNumberInput {
  @Field(() => PhoneNumberType)
  @IsEnum(PhoneNumberType)
  type!: PhoneNumberType;

  @Field(() => String)
  @IsString()
  @Matches(PHONE_RE, { message: 'invalid phone number format' })
  number!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  label?: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  isPrimary?: boolean;
}

/**
 * Input type for adding a phone number to a user.
 */
@InputType()
export class AddPhoneNumberInput {
  @Field(() => ID)
  @IsString()
  userId!: string;

  @Field(() => String)
  @IsString()
  @Length(3, 32)
  number!: string;

  @Field(() => PhoneNumberType)
  @IsEnum(PhoneNumberType)
  type!: PhoneNumberType;
}

/**
 * Input type for removing a phone number from a user.
 */
@InputType()
export class RemovePhoneNumberInput {
  @Field(() => ID)
  @IsString()
  userId!: string;

  @Field(() => ID)
  @IsString()
  phoneNumberId!: string;
}
