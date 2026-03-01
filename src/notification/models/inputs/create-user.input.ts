import { UserType } from '../enums/user-type.enum.js';
import { UserAddressInput } from './address.input.js';
import { ContactInput } from './contact.input.js';
import { CustomerInput } from './customer.input.js';
import { EmployeeInput } from './employee.input.js';
import { PersonalInfoInput } from './personal-info.input.js';
import { PhoneNumberInput } from './phone-number.input.js';
import { AddSecurityQuestionInput } from './security-question.input.js';
import { Field, InputType } from '@nestjs/graphql';
import { IsString, Length } from 'class-validator';

/**
 * Input type for creating a new user.
 * Corresponds to fields in the User entity.
 */
@InputType()
export class CreateUserInput {
  @Field(() => String)
  @IsString()
  @Length(3, 32)
  username!: string;

  @Field(() => String)
  @IsString()
  @Length(8, 32)
  password!: string;

  @Field(() => UserType)
  userType!: UserType;

  @Field(() => PersonalInfoInput)
  personalInfo!: PersonalInfoInput;

  @Field(() => [PhoneNumberInput], { nullable: true })
  phoneNumbers?: PhoneNumberInput[];

  @Field(() => [UserAddressInput])
  addresses!: UserAddressInput[];

  @Field(() => CustomerInput, { nullable: true })
  customer?: CustomerInput;

  @Field(() => EmployeeInput, { nullable: true })
  employee?: EmployeeInput;

  @Field(() => [ContactInput], { nullable: true })
  contacts?: ContactInput[];

  @Field(() => [AddSecurityQuestionInput], { nullable: true })
  securityQuestions?: AddSecurityQuestionInput[];

  @Field(() => [String], { nullable: true })
  invitationIds?: string[];
}
