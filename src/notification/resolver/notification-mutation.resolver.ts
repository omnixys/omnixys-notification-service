/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/only-throw-error */
import { ForbiddenException, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Resolver } from '@nestjs/graphql';

import {
  CurrentUser,
  CurrentUserData,
} from '../../auth/decorators/current-user.decorator.js';

import { NotificationInput } from '../models/inputs/notify.input.js';
import { NotificationMapper } from '../models/mappers/notification.mapper.js';
import { NotificationPayload } from '../models/payloads/notification.payload.js';
import { NotificationReadService } from '../services/notification-read.service.js';
import { NotificationWriteService } from '../services/notification-write.service.js';
import { BulkSendInvitationsInput } from '../models/inputs/bulk-send-invitations.input.js';
import { BulkSendInvitationsPayload } from '../models/payloads/bulk-send-invitations.payload.js';
import { CookieAuthGuard } from '../../auth/guards/cookie-auth.guard.js';

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
}
