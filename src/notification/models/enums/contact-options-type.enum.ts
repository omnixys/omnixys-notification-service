import { registerEnumType } from '@nestjs/graphql';

/**
 * Represents preferred contact channels.
 * Mirrors the Prisma enum `ContactOptionsType`.
 */
export enum ContactOptionsType {
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
  LETTER = 'LETTER',
}

registerEnumType(ContactOptionsType, {
  name: 'ContactOptionsType',
  description: 'Defines preferred communication channels for a user.',
});
