import { LoggerPlus } from '../../logger/logger-plus.js';
import { LoggerPlusService } from '../../logger/logger-plus.service.js';
import { Args, Int, Query, Resolver } from '@nestjs/graphql';

import { NotificationFilterInput } from '../models/inputs/notification-filter.input.js';
import { NotificationMapper } from '../models/mappers/notification.mapper.js';
import { NotificationPayload } from '../models/payloads/notification.payload.js';
import { NotificationReadService } from '../services/notification-read.service.js';

@Resolver()
export class NotificationQueryResolver {
  private readonly logger: LoggerPlus;

  constructor(
    loggerService: LoggerPlusService,
    private readonly notificationReadService: NotificationReadService,
  ) {
    this.logger = loggerService.getLogger(NotificationQueryResolver.name);
  }

  // ─────────────────────────────────────────────
  // FIND BY ID
  // ─────────────────────────────────────────────

  @Query(() => NotificationPayload)
  async notification(@Args('id') id: string): Promise<NotificationPayload> {
    this.logger.debug('notification: id=%s', id);

    const entity = await this.notificationReadService.findById(id);
    return NotificationMapper.toPayload(entity);
  }

  // ─────────────────────────────────────────────
  // GENERIC FIND WITH FILTER
  // ─────────────────────────────────────────────

  @Query(() => [NotificationPayload])
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
  async myNotifications(
    @Args('recipientId') recipientId: string,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ): Promise<NotificationPayload[]> {
    this.logger.debug(
      'notificationsByUser: recipientId=%s limit=%s',
      recipientId,
      limit,
    );

    const entities = await this.notificationReadService.findByUserId(
      recipientId,
      limit ?? 50,
    );

    return NotificationMapper.toPayloadList(entities);
  }
}
