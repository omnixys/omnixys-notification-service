/* eslint-disable @typescript-eslint/only-throw-error */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  CurrentUser,
  CurrentUserData,
} from '../../auth/decorators/current-user.decorator.js';
import { CookieAuthGuard } from '../../auth/guards/cookie-auth.guard.js';
import { LoggerPlusService } from '../../logger/logger-plus.service.js';
import {
  ListAllNotificationsInput,
  ListNotificationsInput,
} from '../models/inputs/inputs.js';
import {
  NotificationPagePayload,
  NotificationPayload,
} from '../models/payloads/notification.payload.js';
import { NotificationReadService } from '../services/notification-read.service.js';
import { ForbiddenException, UseGuards } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';

@Resolver()
export class NotificationQueryResolver {
  private readonly logger;

  constructor(
    private readonly loggerService: LoggerPlusService,
    private readonly notificationReadService: NotificationReadService,
  ) {
    this.logger = this.loggerService.getLogger(NotificationQueryResolver.name);
  }

  @Query(() => NotificationPayload, { nullable: true })
  async notification(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    void this.logger.debug('notificationById: id=%s', id);

    const notification = await this.notificationReadService.findById(id);

    if (notification.recipientId !== user.id) {
      throw new ForbiddenException('Access denied');
    }

    return notification;
  }

  @Query(() => [NotificationPayload])
  @UseGuards(CookieAuthGuard)
  async myNotifications(
    @CurrentUser() user: CurrentUserData,
  ): Promise<NotificationPayload[]> {
    void this.logger.debug('notificationByUser: user=%o', user);
    const notifications = await this.notificationReadService.findByUser(
      user.id,
    );
    void this.logger.debug(
      'notificationByUser: notifications=%o',
      notifications,
    );
    return notifications;
  }

  @Query(() => NotificationPagePayload)
  async notificationsPaged(
    @Args('input') input: ListAllNotificationsInput,
  ): Promise<NotificationPagePayload> {
    const result = await this.notificationReadService.findConnection(input);
    return result;
  }

  @Query(() => NotificationPagePayload)
  async myNotificationsPaged(
    @Args('input') input: ListNotificationsInput,
    @CurrentUser() user: CurrentUserData,
  ): Promise<NotificationPagePayload> {
    return this.notificationReadService.findConnectionForUser({
      ...input,
      recipientUsername: user.username,
    });
  }
}
