import { PrismaService } from '../../../prisma/prisma.service.js';
import { Injectable } from '@nestjs/common';
import {
  uniqueEventPermissions,
  type EventPermissionKey,
  type EventRoleType,
} from '@omnixys/contracts';
import { EventPermissionResolver, EventRoleResolver } from '@omnixys/security';

@Injectable()
export class NotificationEventRoleResolver
  extends EventRoleResolver
  implements EventPermissionResolver
{
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getRoleForUser(_userId: string, _eventId: string): Promise<EventRoleType | null> {
    return null;
  }

  async getPermissionsForUser(
    userId: string,
    eventId: string,
  ): Promise<readonly EventPermissionKey[]> {
    const access = await this.prisma.eventAccessProjection.findUnique({
      where: {
        uq_event_access_projection: { eventId, userId },
      },
      select: { permissions: true },
    });

    return uniqueEventPermissions(access?.permissions ?? []);
  }
}
