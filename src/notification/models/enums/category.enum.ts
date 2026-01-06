import { registerEnumType } from '@nestjs/graphql';

export enum Category {
  WHATSAPP = 'WHATSAPP',
  INFO = 'INFO',
  WARNING = 'WARNING',
}
registerEnumType(Category, { name: 'Category' });
