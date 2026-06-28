import { Args, Int, Query, Resolver } from '@nestjs/graphql';

import { NotificationFilterInput } from '../models/inputs/notification-filter.input.js';
import { NotificationMapper } from '../models/mappers/notification.mapper.js';
import { NotificationPayload } from '../models/payloads/notification.payload.js';
import { NotificationReadService } from '../services/notification-read.service.js';
import { UseGuards } from '@nestjs/common';
import { RealmRoleType } from '@omnixys/contracts';
import { OmnixysLogger } from '@omnixys/logger';
import {
  AuthenticationRequiredException,
  CookieAuthGuard,
  CurrentUser,
  CurrentUserData,
  RoleGuard,
  Roles,
} from '@omnixys/security';

@Resolver()
export class NotificationQueryResolver {
  private readonly logger;

  constructor(
    loggerService: OmnixysLogger,
    private readonly notificationReadService: NotificationReadService,
  ) {
    this.logger = loggerService.log(this.constructor.name);
  }

  // ─────────────────────────────────────────────
  // FIND BY ID
  // ─────────────────────────────────────────────

  @Query(() => NotificationPayload)
  @UseGuards(CookieAuthGuard, RoleGuard)
  @Roles(RealmRoleType.ADMIN)
  async notification(@Args('id') id: string): Promise<NotificationPayload> {
    this.logger.debug('notification: id=%s', id);

    const entity = await this.notificationReadService.findById(id);
    return NotificationMapper.toPayload(entity);
  }

  // ─────────────────────────────────────────────
  // GENERIC FIND WITH FILTER
  // ─────────────────────────────────────────────

  @Query(() => [NotificationPayload])
  @UseGuards(CookieAuthGuard, RoleGuard)
  @Roles(RealmRoleType.ADMIN)
  async notifications(
    @Args('filter', { nullable: true }) filter?: NotificationFilterInput,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ): Promise<NotificationPayload[]> {
    this.logger.debug('notifications: filter=%o limit=%s', filter, limit);

    const entities = await this.notificationReadService.find(
      filter,
      limit ?? 50,
    );

    return NotificationMapper.toPayloadList(entities);
  }

  // ─────────────────────────────────────────────
  // FIND BY USER ID
  // ─────────────────────────────────────────────

  @Query(() => [NotificationPayload])
  @UseGuards(CookieAuthGuard)
  async myNotifications(
    @CurrentUser() currentUser: CurrentUserData,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ): Promise<NotificationPayload[]> {
    if (!currentUser) {
      throw new AuthenticationRequiredException();
    }

    this.logger.debug(
      'notificationsByUser: recipientId=%s limit=%s',
      currentUser.id,
      limit,
    );

    const entities = await this.notificationReadService.findByUserId(
      currentUser.id,
      limit ?? 50,
    );

    return NotificationMapper.toPayloadList(entities);
  }
}
