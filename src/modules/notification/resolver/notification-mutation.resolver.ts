import { CreateNotificationInput } from '../models/inputs/create-notification.input.js';
import { SendInvitationsInput } from '../models/inputs/send-invitations.input.js';
import { NotificationMapper } from '../models/mappers/notification.mapper.js';
import { NotificationPayload } from '../models/payloads/notification.payload.js';
import { NotificationWriteService } from '../services/notification-write.service.js';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import {
  ClientIp,
  Device,
  Location,
  RequestCookies,
} from '@omnixys/context-ts';
import type { OmnixysCookieRequest } from '@omnixys/contracts-ts';
import { EventPermissionKey, RealmRoleType } from '@omnixys/contracts-ts';
import { CreateUserInput } from '@omnixys/graphql-ts';
import { OmnixysLogger } from '@omnixys/logger-ts';
import {
  CookieAuthGuard,
  CurrentUser,
  CurrentUserData,
  EventAccessDeniedException,
  EventPermissionResolver,
  RoleGuard,
  Roles,
} from '@omnixys/security-ts';

@Resolver()
export class NotificationMutationResolver {
  private readonly logger;

  constructor(
    loggerService: OmnixysLogger,
    private readonly notificationWriteService: NotificationWriteService,
    private readonly eventPermissionResolver: EventPermissionResolver,
  ) {
    this.logger = loggerService.log(
      'service:notification',
      this.constructor.name,
    );
  }

  // ─────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────

  @Mutation(() => NotificationPayload)
  @UseGuards(CookieAuthGuard, RoleGuard)
  @Roles(RealmRoleType.ADMIN)
  async createNotification(
    @Args('input') input: CreateNotificationInput,
  ): Promise<NotificationPayload> {
    this.logger.info(
      'createNotification: recipient=%s',
      input.recipientUsername,
    );

    const entity = await this.notificationWriteService.createAndDispatch({
      ...input,
    });

    return NotificationMapper.toPayload(entity);
  }

  @Mutation(() => NotificationPayload)
  @UseGuards(CookieAuthGuard)
  async markMyNotificationAsRead(
    @Args('id') id: string,
    @CurrentUser() currentUser: CurrentUserData,
  ): Promise<NotificationPayload> {
    const entity = await this.notificationWriteService.markAsReadForUser(
      id,
      currentUser.id,
    );
    return NotificationMapper.toPayload(entity);
  }

  @Mutation(() => NotificationPayload)
  @UseGuards(CookieAuthGuard)
  async archiveMyNotification(
    @Args('id') id: string,
    @CurrentUser() currentUser: CurrentUserData,
  ): Promise<NotificationPayload> {
    const entity = await this.notificationWriteService.archiveForUser(
      id,
      currentUser.id,
    );
    return NotificationMapper.toPayload(entity);
  }

  // ─────────────────────────────────────────────
  // MARK AS READ
  // ─────────────────────────────────────────────

  @Mutation(() => NotificationPayload)
  @UseGuards(CookieAuthGuard, RoleGuard)
  @Roles(RealmRoleType.ADMIN)
  async markNotificationAsRead(
    @Args('id') id: string,
  ): Promise<NotificationPayload> {
    const entity = await this.notificationWriteService.markAsRead(id);
    return NotificationMapper.toPayload(entity);
  }

  @Mutation(() => NotificationPayload)
  @UseGuards(CookieAuthGuard, RoleGuard)
  @Roles(RealmRoleType.ADMIN)
  async markNotificationAsUnread(
    @Args('id') id: string,
  ): Promise<NotificationPayload> {
    const entity = await this.notificationWriteService.markAsUnread(id);
    return NotificationMapper.toPayload(entity);
  }

  // ─────────────────────────────────────────────
  // ARCHIVE
  // ─────────────────────────────────────────────

  @Mutation(() => NotificationPayload)
  @UseGuards(CookieAuthGuard, RoleGuard)
  @Roles(RealmRoleType.ADMIN)
  async archiveNotification(
    @Args('id') id: string,
  ): Promise<NotificationPayload> {
    const entity = await this.notificationWriteService.archive(id);
    return NotificationMapper.toPayload(entity);
  }

  @Mutation(() => NotificationPayload)
  @UseGuards(CookieAuthGuard, RoleGuard)
  @Roles(RealmRoleType.ADMIN)
  async unarchiveNotification(
    @Args('id') id: string,
  ): Promise<NotificationPayload> {
    const entity = await this.notificationWriteService.unarchive(id);
    return NotificationMapper.toPayload(entity);
  }

  // ─────────────────────────────────────────────
  // CANCEL
  // ─────────────────────────────────────────────

  @Mutation(() => NotificationPayload)
  @UseGuards(CookieAuthGuard, RoleGuard)
  @Roles(RealmRoleType.ADMIN)
  async cancelNotification(
    @Args('id') id: string,
  ): Promise<NotificationPayload> {
    const entity = await this.notificationWriteService.cancel(id);
    return NotificationMapper.toPayload(entity);
  }

  // ─────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────

  @Mutation(() => Boolean)
  @UseGuards(CookieAuthGuard, RoleGuard)
  @Roles(RealmRoleType.ADMIN)
  async deleteNotification(@Args('id') id: string): Promise<boolean> {
    await this.notificationWriteService.delete(id);
    return true;
  }

  @Mutation(() => Boolean)
  async createSignupVerification(
    @Args('createUserInput') createUserInput: CreateUserInput,
    @RequestCookies() cookies: OmnixysCookieRequest,
    @Device() device: string,
    @Location() location: string,
    @ClientIp() ipAddress?: string,
  ): Promise<boolean> {
    const locale = cookies.locale ?? 'en-US';

    this.logger.info(
      'createSignupVerification: username=%s locale=%s securityQuestions=%o',
      createUserInput.username,
      locale,
      createUserInput.securityQuestions,
    );

    this.logger.debug(
      'createSignupVerification context: ipAddressAvailable=%s deviceAvailable=%s locationAvailable=%s',
      Boolean(ipAddress),
      Boolean(device),
      Boolean(location),
    );

    await this.notificationWriteService.createSignupVerification({
      createUserInput,
      locale,
    });

    return true;
  }

  @Mutation(() => Boolean)
  @UseGuards(CookieAuthGuard, RoleGuard)
  @Roles(RealmRoleType.USER)
  async sendInvitations(
    @Args('input') input: SendInvitationsInput,
    @CurrentUser() currentUser: CurrentUserData,
  ): Promise<boolean> {
    this.logger.info('sendInvitations called: guests=%s', input.guests.length);

    await this.assertCanSendInvitations(input, currentUser);
    await this.notificationWriteService.sendBulkInvitations(input);

    return true;
  }

  private async assertCanSendInvitations(
    input: SendInvitationsInput,
    currentUser: CurrentUserData,
  ): Promise<void> {
    const eventIds = [...new Set(input.guests.map((guest) => guest.eventId))];

    await Promise.all(
      eventIds.map(async (eventId) => {
        const permissions =
          await this.eventPermissionResolver.getPermissionsForUser(
            currentUser.id,
            eventId,
          );

        if (!permissions.includes(EventPermissionKey.SendNotifications)) {
          throw new EventAccessDeniedException({
            eventId,
            userId: currentUser.id,
            reason: 'event-permission-mismatch',
            actualPermissions: permissions,
            requiredPermissions: [EventPermissionKey.SendNotifications],
          });
        }
      }),
    );
  }
}
