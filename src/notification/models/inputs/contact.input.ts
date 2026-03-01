import { RelationshipType } from '../enums/relationship-type.enum.js';
import { Field, ID, InputType } from '@nestjs/graphql';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsInt,
} from 'class-validator';

@InputType()
export class ContactInput {
  @Field()
  @IsString()
  contactId!: string;

  @Field(() => RelationshipType)
  @IsEnum(RelationshipType)
  relationship!: RelationshipType;

  @Field(() => Number, { nullable: true })
  @IsOptional()
  @IsInt()
  withdrawalLimit?: number;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  emergency?: boolean;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  startDate?: Date;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  endDate?: Date;
}

/**
 * Input type for adding a phone number to a user.
 */
@InputType()
export class AddContactInput {
  @Field(() => ID)
  @IsString()
  userId!: string;

  @Field(() => String)
  Contact!: ContactInput;
}

/**
 * Input type for removing a phone number from a user.
 */
@InputType()
export class RemoveContactInput {
  @Field(() => ID)
  @IsString()
  userId!: string;

  @Field(() => ID)
  @IsString()
  contactId!: string;
}
