import { Field, ID, InputType } from '@nestjs/graphql';
import { IsOptional, IsString, Length } from 'class-validator';

@InputType()
export class UserAddressInput {
  @Field()
  @IsString()
  @Length(1, 255)
  street!: string;

  @Field()
  @IsString()
  houseNumber!: string;

  @Field()
  @IsString()
  zipCode!: string;

  @Field()
  @IsString()
  city!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  state?: string;

  @Field()
  @IsString()
  country!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  additionalInfo?: string;
}

/**
 * Input type for adding a phone number to a user.
 */
@InputType()
export class AddAddressInput {
  @Field(() => ID)
  @IsString()
  userId!: string;

  @Field(() => String)
  @IsString()
  @Length(3, 32)
  address!: UserAddressInput;
}

/**
 * Input type for removing a phone number from a user.
 */
@InputType()
export class RemoveAddressInput {
  @Field(() => ID)
  @IsString()
  userId!: string;

  @Field(() => ID)
  @IsString()
  addressId!: string;
}
