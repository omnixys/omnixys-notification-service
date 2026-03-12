/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable curly */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { LoggerPlus } from '../../logger/logger-plus.js';
import { LoggerPlusService } from '../../logger/logger-plus.service.js';
import { CreateNotificationInput } from '../models/inputs/create-notification.input.js';
import { NotificationMapper } from '../models/mappers/notification.mapper.js';
import { NotificationPayload } from '../models/payloads/notification.payload.js';
import { NotificationWriteService } from '../services/notification-write.service.js';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { ClientIp, RequestCookies, RequestHeaders } from '@omnixys/context';
import { CreateUserInput } from '@omnixys/graphql';
import geoip from 'geoip-lite';
import { UAParser } from 'ua-parser-js';

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
    @RequestCookies() cookies: Record<string, string>,
    @RequestHeaders() headers: Record<string, string>,
    @ClientIp() ipAddress?: string,
  ): Promise<boolean> {
    const locale = cookies.locale ?? 'en-US';

    this.logger.info(
      'createSignupVerification: username=%s locale=%s',
      createUserInput.username,
      locale,
    );

    const userAgent = headers['user-agent'];
    const device = extractDevice(userAgent);

    const geo = ipAddress ? geoip.lookup(ipAddress) : null;
    const location = geo ? `${geo.city}, ${geo.country}` : 'Unknown location';

    console.debug({ ipAddress, device, location });

    await this.notificationWriteService.createSignupVerification({
      createUserInput,
      locale,
    });

    return true;
  }
}

export function extractDevice(userAgent?: string) {
  if (!userAgent) return 'Unknown device';

  if (userAgent.includes('PostmanRuntime')) {
    return 'Postman client';
  }

  const parser = new UAParser(userAgent);

  const browser = parser.getBrowser().name ?? 'Unknown browser';
  const os = parser.getOS().name ?? 'Unknown OS';

  return `${browser} on ${os}`;
}
