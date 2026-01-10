import { ForbiddenException, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Resolver } from '@nestjs/graphql';

import {
  CurrentUser,
  CurrentUserData,
} from '../../auth/decorators/current-user.decorator.js';

import { CookieAuthGuard } from '../../auth/guards/cookie-auth.guard.js';
import { BulkSendInvitationsInput } from '../models/inputs/bulk-send-invitations.input.js';
import { NotificationInput } from '../models/inputs/notify.input.js';
import { NotificationMapper } from '../models/mappers/notification.mapper.js';
import { BulkSendInvitationsPayload } from '../models/payloads/bulk-send-invitations.payload.js';
import { NotificationPayload } from '../models/payloads/notification.payload.js';
import { NotificationReadService } from '../services/notification-read.service.js';
import { NotificationWriteService } from '../services/notification-write.service.js';

@Resolver()
export class NotificationMutationResolver {
  constructor(
    private readonly notificationWriteService: NotificationWriteService,
    private readonly notificationReadService: NotificationReadService,
  ) {}

  /**
   * INTERNAL mutation.
   * Must be protected by role/guard (e.g. SERVICE, ADMIN).
   */
  @Mutation(() => NotificationPayload)
  async notifyFromTemplate(
    @Args('input') input: NotificationInput,
  ): Promise<NotificationPayload> {
    const notification = await this.notificationWriteService.create(input);

    return NotificationMapper.toPayload(notification);
  }

  @Mutation(() => Boolean)
  @UseGuards(CookieAuthGuard)
  async markNotificationAsRead(
    @Args('notificationId', { type: () => ID }) notificationId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<boolean> {
    const notification =
      await this.notificationReadService.findById(notificationId);

    if (notification.recipientId !== user.id) {
      throw new ForbiddenException('Access denied');
    }

    await this.notificationWriteService.markAsRead(notificationId);
    return true;
  }

  @Mutation(() => Boolean)
  @UseGuards(CookieAuthGuard)
  async archiveNotification(
    @Args('notificationId', { type: () => ID }) notificationId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<boolean> {
    const notification =
      await this.notificationReadService.findById(notificationId);

    if (notification.recipientId !== user.id) {
      throw new ForbiddenException('Access denied');
    }

    await this.notificationWriteService.archive(notificationId);
    return true;
  }

  @Mutation(() => Boolean)
  @UseGuards(CookieAuthGuard)
  async deleteNotification(
    @Args('notificationId', { type: () => ID }) notificationId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<boolean> {
    const notification =
      await this.notificationReadService.findById(notificationId);

    if (notification.recipientId !== user.id) {
      throw new ForbiddenException('Access denied');
    }

    await this.notificationWriteService.delete(notificationId);
    return true;
  }

  /* ------------------------------------------------------------------ */
  /* BULK OPERATIONS                                                     */
  /* ------------------------------------------------------------------ */

  @Mutation(() => Boolean)
  @UseGuards(CookieAuthGuard)
  async markNotificationsAsReadBulk(
    @Args({ name: 'notificationIds', type: () => [ID] })
    notificationIds: string[],
    @CurrentUser() user: CurrentUserData,
  ): Promise<boolean> {
    const notifications =
      await this.notificationReadService.findByIds(notificationIds);

    if (notifications.some((n) => n.recipientId !== user.id)) {
      throw new ForbiddenException('Access denied');
    }

    await this.notificationWriteService.markAsReadBulk(notificationIds);

    return true;
  }

  @Mutation(() => Boolean)
  @UseGuards(CookieAuthGuard)
  async archiveNotificationsBulk(
    @Args({ name: 'notificationIds', type: () => [ID] })
    notificationIds: string[],
    @CurrentUser() user: CurrentUserData,
  ): Promise<boolean> {
    const notifications =
      await this.notificationReadService.findByIds(notificationIds);

    if (notifications.some((n) => n.recipientId !== user.id)) {
      throw new ForbiddenException('Access denied');
    }

    await this.notificationWriteService.archiveBulk(notificationIds);

    return true;
  }

  @Mutation(() => Boolean)
  @UseGuards(CookieAuthGuard)
  async deleteNotificationsBulk(
    @Args({ name: 'notificationIds', type: () => [ID] })
    notificationIds: string[],
    @CurrentUser() user: CurrentUserData,
  ): Promise<boolean> {
    const notifications =
      await this.notificationReadService.findByIds(notificationIds);

    if (notifications.some((n) => n.recipientId !== user.id)) {
      throw new ForbiddenException('Access denied');
    }

    await this.notificationWriteService.deleteBulk(notificationIds);

    return true;
  }

  /**
   * INTERNAL – used by Invitation / Event services
   */
  @Mutation(() => BulkSendInvitationsPayload)
  @UseGuards(CookieAuthGuard)
  async bulkSendInvitations(
    @Args('input') input: BulkSendInvitationsInput,
    @CurrentUser() user: CurrentUserData,
  ): Promise<BulkSendInvitationsPayload> {
    return this.notificationWriteService.bulkSendInvitation(input, user.id);
  }

  @Mutation(() => Boolean)
  @UseGuards(CookieAuthGuard)
  async markNotificationAsUnread(
    @Args('notificationId', { type: () => ID }) notificationId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<boolean> {
    const notification =
      await this.notificationReadService.findById(notificationId);

    if (notification.recipientId !== user.id) {
      throw new ForbiddenException('Access denied');
    }

    await this.notificationWriteService.markAsUnread(notificationId);
    return true;
  }

  @Mutation(() => Boolean)
  @UseGuards(CookieAuthGuard)
  async markNotificationsAsUnreadBulk(
    @Args({ name: 'notificationIds', type: () => [ID] })
    notificationIds: string[],
    @CurrentUser() user: CurrentUserData,
  ): Promise<boolean> {
    const notifications =
      await this.notificationReadService.findByIds(notificationIds);

    if (notifications.some((n) => n.recipientId !== user.id)) {
      throw new ForbiddenException('Access denied');
    }

    await this.notificationWriteService.markAsUnreadBulk(notificationIds);
    return true;
  }

  @Mutation(() => Boolean)
  @UseGuards(CookieAuthGuard)
  async unarchiveNotification(
    @Args('notificationId', { type: () => ID }) notificationId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<boolean> {
    const notification =
      await this.notificationReadService.findById(notificationId);

    if (notification.recipientId !== user.id) {
      throw new ForbiddenException('Access denied');
    }

    await this.notificationWriteService.unarchive(notificationId);
    return true;
  }

  @Mutation(() => Boolean)
  @UseGuards(CookieAuthGuard)
  async unarchiveNotificationsBulk(
    @Args({ name: 'notificationIds', type: () => [ID] })
    notificationIds: string[],
    @CurrentUser() user: CurrentUserData,
  ): Promise<boolean> {
    const notifications =
      await this.notificationReadService.findByIds(notificationIds);

    if (notifications.some((n) => n.recipientId !== user.id)) {
      throw new ForbiddenException('Access denied');
    }

    await this.notificationWriteService.unarchiveBulk(notificationIds);
    return true;
  }
}
