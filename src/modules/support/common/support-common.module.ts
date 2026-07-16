import { NotificationEventRoleResolver } from './event-role-resolver.service.js';
import { Module } from '@nestjs/common';
import { EventPermissionResolver, EventRoleResolver } from '@omnixys/security';

@Module({
  providers: [
    {
      provide: EventRoleResolver,
      useClass: NotificationEventRoleResolver,
    },
    {
      provide: EventPermissionResolver,
      useExisting: EventRoleResolver,
    },
  ],
  exports: [EventRoleResolver, EventPermissionResolver],
})
export class SupportCommonModule {}
