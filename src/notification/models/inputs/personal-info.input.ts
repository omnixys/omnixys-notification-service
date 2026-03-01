import { GenderType } from '../enums/gender-type.enum.js';
import { MaritalStatusType } from '../enums/marital-status-type.enum.js';
import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

@InputType()
export class PersonalInfoInput {
  @Field()
  @IsEmail()
  email!: string;

  @Field()
  @IsString()
  firstName!: string;

  @Field()
  @IsString()
  lastName!: string;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  birthDate?: Date;

  @Field(() => GenderType, { nullable: true })
  @IsOptional()
  @IsEnum(GenderType)
  gender?: GenderType;

  @Field(() => MaritalStatusType, { nullable: true })
  @IsOptional()
  @IsEnum(MaritalStatusType)
  maritalStatus?: MaritalStatusType;
}
