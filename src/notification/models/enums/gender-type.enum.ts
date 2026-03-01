import { registerEnumType } from '@nestjs/graphql';

/**
 * Represents the gender of a person.
 * Mirrors the Prisma enum `GenderType`.
 */
export enum GenderType {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  DIVERSE = 'DIVERSE',
  UNKNOWN = 'UNKNOWN',
}

registerEnumType(GenderType, {
  name: 'GenderType',
  description: 'Specifies the gender of a person.',
});
