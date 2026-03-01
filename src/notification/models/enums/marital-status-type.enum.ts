import { registerEnumType } from '@nestjs/graphql';

/**
 * Represents the marital status of a person.
 * Mirrors the Prisma enum `MaritalStatusType`.
 */
export enum MaritalStatusType {
  SINGLE = 'SINGLE',
  MARRIED = 'MARRIED',
  DIVORCED = 'DIVORCED',
  WIDOWED = 'WIDOWED',
}

registerEnumType(MaritalStatusType, {
  name: 'MaritalStatusType',
  description: 'Specifies the marital status of a person.',
});
