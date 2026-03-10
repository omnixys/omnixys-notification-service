import { registerEnumType } from '@nestjs/graphql';

export enum Category {
  WHATSAPP = 'WHATSAPP',
  INFO = 'INFO',
  WARNING = 'WARNING',
}
registerEnumType(Category, { name: 'Category' });

export enum AddressType {
  HOME = 'HOME',
  WORK = 'WORK',
}
registerEnumType(AddressType, { name: 'AddressType' });
