import { registerEnumType } from '@nestjs/graphql';

/**
 * Defines the relationship type between two users.
 * Mirrors the Prisma enum `RelationshipType`.
 */
export enum RelationshipType {
  FAMILY = 'FAMILY',
  FRIEND = 'FRIEND',
  PARTNER = 'PARTNER',
  COLLEAGUE = 'COLLEAGUE',
  OTHER = 'OTHER',
  BUSINESS_PARTNER = 'BUSINESS_PARTNER',
  RELATIVE = 'RELATIVE',
  PARENT = 'PARENT',
  SIBLING = 'SIBLING',
  CHILD = 'CHILD',
  COUSIN = 'COUSIN',
}

registerEnumType(RelationshipType, {
  name: 'RelationshipType',
  description: 'Defines the type of relationship between two users.',
});
