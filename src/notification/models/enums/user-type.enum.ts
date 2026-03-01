import { registerEnumType } from '@nestjs/graphql';

/**
 * Defines the high-level category of a user.
 * Mirrors the Prisma enum `UserType`.
 */
export enum UserType {
  CUSTOMER = 'CUSTOMER',
  EMPLOYEE = 'EMPLOYEE',
  GUEST = 'GUEST',
}

registerEnumType(UserType, {
  name: 'UserType',
  description: 'Specifies the category of a user (customer, employee, guest).',
});
