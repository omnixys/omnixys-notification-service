import { registerEnumType } from '@nestjs/graphql';

/**
 * Represents user interests.
 * Mirrors the Prisma enum `InterestType`.
 */
export enum InterestType {
  SPORTS = 'SPORTS',
  MUSIC = 'MUSIC',
  TRAVEL = 'TRAVEL',
  TECHNOLOGY = 'TECHNOLOGY',
  OTHER = 'OTHER',

  INVESTMENTS = 'INVESTMENTS',
  SAVING_AND_FINANCE = 'SAVING_AND_FINANCE',
  CREDIT_AND_DEBT = 'CREDIT_AND_DEBT',
  BANK_PRODUCTS_AND_SERVICES = 'BANK_PRODUCTS_AND_SERVICES',
  FINANCIAL_EDUCATION_AND_COUNSELING = 'FINANCIAL_EDUCATION_AND_COUNSELING',
  REAL_ESTATE = 'REAL_ESTATE',
  INSURANCE = 'INSURANCE',
  SUSTAINABLE_FINANCE = 'SUSTAINABLE_FINANCE',
  TECHNOLOGY_AND_INNOVATION = 'TECHNOLOGY_AND_INNOVATION',
}

registerEnumType(InterestType, {
  name: 'InterestType',
  description: 'Represents areas of interest associated with a user.',
});
