import { LoggerPlus } from '../../logger/logger-plus.js';
import { LoggerPlusService } from '../../logger/logger-plus.service.js';
import { CreateNotificationInput } from '../models/inputs/create-notification.input.js';
import { NotificationMapper } from '../models/mappers/notification.mapper.js';
import { NotificationPayload } from '../models/payloads/notification.payload.js';
import { NotificationWriteService } from '../services/notification-write.service.js';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CreateUserInput } from '@omnixys/graphql';

@Resolver()
export class NotificationMutationResolver {
  private readonly logger: LoggerPlus;

  constructor(
    loggerService: LoggerPlusService,
    private readonly notificationWriteService: NotificationWriteService,
  ) {
    this.logger = loggerService.getLogger(NotificationMutationResolver.name);
  }

  // ─────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────

  @Mutation(() => NotificationPayload)
  async createNotification(
    @Args('input') input: CreateNotificationInput,
  ): Promise<NotificationPayload> {
    this.logger.info(
      'createNotification: recipient=%s',
      input.recipientUsername,
    );

    const entity = await this.notificationWriteService.create({
      ...input,
    });

    return NotificationMapper.toPayload(entity);
  }

  // ─────────────────────────────────────────────
  // MARK AS READ
  // ─────────────────────────────────────────────

  @Mutation(() => NotificationPayload)
  async markNotificationAsRead(
    @Args('id') id: string,
  ): Promise<NotificationPayload> {
    const entity = await this.notificationWriteService.markAsRead(id);
    return NotificationMapper.toPayload(entity);
  }

  @Mutation(() => NotificationPayload)
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
  async archiveNotification(
    @Args('id') id: string,
  ): Promise<NotificationPayload> {
    const entity = await this.notificationWriteService.archive(id);
    return NotificationMapper.toPayload(entity);
  }

  @Mutation(() => NotificationPayload)
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
  async deleteNotification(@Args('id') id: string): Promise<boolean> {
    await this.notificationWriteService.delete(id);
    return true;
  }

  @Mutation(() => Boolean)
  async createSignupVerification(
    @Args('createUserInput') createUserInput: CreateUserInput,
  ): Promise<boolean> {
    this.logger.info(
      'createSignupVerification: username=%s',
      createUserInput.username,
    );

    await this.notificationWriteService.createSignupVerification(
      createUserInput,
    );

    return true;
  }
}
