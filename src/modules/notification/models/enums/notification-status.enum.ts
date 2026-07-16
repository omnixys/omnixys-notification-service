import { registerEnumType } from '@nestjs/graphql';

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  PROCESSING = 'PROCESSING',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
  ARCHIVED = 'ARCHIVED',
  CANCELLED = 'CANCELLED',
}
registerEnumType(NotificationStatus, { name: 'NotificationStatus' });
