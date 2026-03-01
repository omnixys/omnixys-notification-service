import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean, IsOptional, IsString, IsNumber } from 'class-validator';

@InputType()
export class EmployeeInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  department?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  position?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  role?: string;

  @Field(() => Number, { nullable: true })
  @IsOptional()
  @IsNumber()
  salary?: number;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  hireDate?: Date;

  @Field(() => Boolean)
  @IsBoolean()
  isExternal!: boolean;
}
