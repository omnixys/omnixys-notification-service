/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-useless-catch */

/* eslint-disable @typescript-eslint/explicit-function-return-type */

import { env } from '../../config/env.js';
import { LoggerPlus } from '../../logger/logger-plus.js';
import { LoggerPlusService } from '../../logger/logger-plus.service.js';
import { MailService } from '../../messages/services/mail.service.js';
import { NotificationStatus, Priority, Prisma } from '../../prisma/generated/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Channel } from '../models/enums/channel.enum.js';
import { formatRequestTime } from '../utils/date.util.js';
import { NotificationCacheService } from './notification-cache.service.js';
import { TemplateRenderService } from './template-renderer.service.js';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SendMagicLinkDTO, SendResetLinkDTO } from '@omnixys/contracts';
import { CreateUserInput } from '@omnixys/graphql';

const { APP_BASE_URL, VERIFY_PATH, MAGIC_PATH, RESET_PATH, FROM_SUPPORT, FROM_NO_REPLY } = env;
export interface CreateNotificationDTO {
  tenantId?: string;
  recipientUsername: string;
  recipientId?: string;
  recipientAddress?: string;

  channel: Channel;
  priority?: Priority;

  templateId?: string;

  variables?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;

  sensitive?: boolean;
  expiresAt?: Date;

  createdBy?: string;
}

@Injectable()
export class NotificationWriteService {
  private readonly logger: LoggerPlus;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationCacheService: NotificationCacheService,
    private readonly mailService: MailService,
    private readonly templateRenderService: TemplateRenderService,
    loggerService: LoggerPlusService,
  ) {
    this.logger = loggerService.getLogger(NotificationWriteService.name);
  }

  // ─────────────────────────────────────────────
  // CREATE (Idempotent optional)
  // ─────────────────────────────────────────────
  async create(input: CreateNotificationDTO) {
    this.logger.debug('create notification: %o', {
      ...input,
      variables: '[masked]',
    });

    try {
      return await this.prisma.notification.create({
        data: {
          tenantId: input.tenantId ?? null,
          recipientUsername: input.recipientUsername,
          recipientId: input.recipientId ?? null,
          recipientAddress: input.recipientAddress ?? null,

          templateId: input.templateId ?? null,

          channel: input.channel,
          priority: input.priority ?? 'NORMAL',

          variables: input.variables ?? {},
          metadata: input.metadata ?? {},

          sensitive: input.sensitive ?? false,
          expiresAt: input.expiresAt ?? null,

          status: NotificationStatus.PENDING,
          createdBy: input.createdBy ?? null,
        },
      });
    } catch (e: any) {
      throw e;
    }
  }

  // ─────────────────────────────────────────────
  // MARK AS READ
  // ─────────────────────────────────────────────
  async markAsRead(id: string) {
    const existing = await this.findOrThrow(id);

    if (existing.readAt) {
      return existing;
    }

    return this.prisma.notification.update({
      where: { id },
      data: {
        readAt: new Date(),
      },
    });
  }

  // ─────────────────────────────────────────────
  // MARK AS UNREAD
  // ─────────────────────────────────────────────
  async markAsUnread(id: string) {
    await this.findOrThrow(id);

    return this.prisma.notification.update({
      where: { id },
      data: {
        readAt: null,
      },
    });
  }

  // ─────────────────────────────────────────────
  // ARCHIVE
  // ─────────────────────────────────────────────
  async archive(id: string) {
    const existing = await this.findOrThrow(id);

    if (existing.archivedAt) {
      return existing;
    }

    return this.prisma.notification.update({
      where: { id },
      data: {
        archivedAt: new Date(),
        status: NotificationStatus.ARCHIVED,
      },
    });
  }

  async unarchive(id: string) {
    const existing = await this.findOrThrow(id);

    if (!existing.archivedAt) {
      return existing;
    }

    return this.prisma.notification.update({
      where: { id },
      data: {
        archivedAt: null,
        status: NotificationStatus.SENT,
      },
    });
  }

  // ─────────────────────────────────────────────
  // CANCEL (only before sent/delivered)
  // ─────────────────────────────────────────────
  async cancel(id: string) {
    const existing = await this.findOrThrow(id);

    if (
      existing.status === NotificationStatus.SENT ||
      existing.status === NotificationStatus.DELIVERED
    ) {
      throw new BadRequestException('Cannot cancel already sent/delivered notification');
    }

    return this.prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.CANCELLED,
      },
    });
  }

  // ─────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────
  async delete(id: string) {
    await this.findOrThrow(id);

    return this.prisma.notification.delete({
      where: { id },
    });
  }

  // ─────────────────────────────────────────────
  // BULK OPERATIONS
  // ─────────────────────────────────────────────
  async markAsReadBulk(ids: string[]) {
    if (!ids.length) {
      return;
    }

    return this.prisma.notification.updateMany({
      where: {
        id: { in: ids },
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });
  }

  async archiveBulk(ids: string[]) {
    if (!ids.length) {
      return;
    }

    return this.prisma.notification.updateMany({
      where: {
        id: { in: ids },
      },
      data: {
        archivedAt: new Date(),
        status: NotificationStatus.ARCHIVED,
      },
    });
  }

  async deleteBulk(ids: string[]) {
    if (!ids.length) {
      return;
    }

    return this.prisma.notification.deleteMany({
      where: {
        id: { in: ids },
      },
    });
  }

  // ─────────────────────────────────────────────
  // INTERNAL HELPER
  // ─────────────────────────────────────────────

  private async findOrThrow(id: string) {
    const entity = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!entity) {
      throw new NotFoundException('Notification not found');
    }

    return entity;
  }

  // ─────────────────────────────────────────────
  // MARK AS SENT
  // ─────────────────────────────────────────────
  async markAsSent(
    id: string,
    options?: {
      provider?: string;
      providerRef?: string;
    },
  ) {
    const existing = await this.findOrThrow(id);

    // State validation
    if (
      existing.status !== NotificationStatus.PENDING &&
      existing.status !== NotificationStatus.PROCESSING
    ) {
      throw new BadRequestException(
        `Cannot mark notification as SENT from status ${existing.status}`,
      );
    }

    return this.prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.SENT,
        deliveredAt: new Date(),
        provider: options?.provider ?? existing.provider ?? null,
        providerRef: options?.providerRef ?? existing.providerRef ?? null,
      },
    });
  }

  async createSignupVerification({
    createUserInput,
    locale,
  }: {
    createUserInput: CreateUserInput;
    locale: string;
  }) {
    this.logger.debug('creating signUp verification');

    // 1️⃣ Store payload in Valkey
    const { verificationId } = await this.notificationCacheService.storeSignupVerificationPayload(
      createUserInput,
      {},
      60 * 15,
    );

    const verifyUrl = `${APP_BASE_URL}${VERIFY_PATH}?token=${verificationId}`;
    this.logger.debug('Created Verify Link %s', verifyUrl);

    // 2️⃣ Render Template
    const { templateId, renderedTitle, renderedBody } =
      await this.templateRenderService.renderFromKey({
        templateKey: 'auth.sign-up-verification.request',
        channel: Channel.EMAIL,
        locale,
        variables: {
          firstName: createUserInput.personalInfo.firstName,
          lastName: createUserInput.personalInfo.lastName,
          actionUrl: verifyUrl,
          expiresInMinutes: 15,
        },
      });

    // 3️⃣ Persist Notification FIRST
    const notification = await this.create({
      tenantId: 'omnixys',
      recipientUsername: createUserInput.username,
      recipientAddress: createUserInput.personalInfo.email,
      channel: Channel.EMAIL,
      priority: Priority.NORMAL,
      templateId,
      variables: {
        firstName: createUserInput.personalInfo.firstName,
        lastName: createUserInput.personalInfo.lastName,
        username: createUserInput.username,
        actionUrl: verifyUrl,
        expiresInMinutes: 15,
      },
      metadata: {
        flow: 'signup-verification',
      },
      sensitive: false,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      createdBy: 'notification-service',
    });

    // 4️⃣ Send Mail
    await this.mailService.send({
      to: createUserInput.personalInfo.email,
      subject: renderedTitle ?? '',
      html: renderedBody,
      format: 'HTML',
      from: FROM_NO_REPLY,
      metadata: {
        notificationId: notification.id,
        flow: 'signup-verification',
      },
    });

    // 5️⃣ Mark as sent
    await this.markAsSent(notification.id, {
      provider: 'resend',
    });

    return verificationId;
  }

  async sendMagicLink({ token, email, locale, username, device, ip, location }: SendMagicLinkDTO) {
    this.logger.debug('creating Magic Link');

    const magicLink = `${APP_BASE_URL}${MAGIC_PATH}?token=${encodeURIComponent(token)}`;
    this.logger.debug('Created Magic Link %s', magicLink);

    const { templateId, renderedTitle, renderedBody } =
      await this.templateRenderService.renderFromKey({
        templateKey: 'auth.magic-link.request',
        channel: Channel.EMAIL,
        locale,
        variables: {
          username,
          actionUrl: magicLink,
          expiresInMinutes: 15,
          ip,
          device,
          location,
          requestTime: formatRequestTime(locale),
          supportEmail: FROM_SUPPORT,
        },
      });

    const notification = await this.create({
      tenantId: 'omnixys',
      recipientUsername: username,
      recipientAddress: email,
      channel: Channel.EMAIL,
      priority: Priority.NORMAL,
      templateId,
      variables: {
        username,
        actionUrl: magicLink,
        expiresInMinutes: 15,
        ip,
        device,
        location,
        requestTime: formatRequestTime(locale),
        supportEmail: FROM_SUPPORT,
      },
      metadata: {
        flow: 'create-magic-link',
      },
      sensitive: false,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      createdBy: 'notification-service',
    });

    // 4️⃣ Send Mail
    await this.mailService.send({
      to: email,
      subject: renderedTitle ?? '',
      html: renderedBody,
      format: 'HTML',
      from: FROM_NO_REPLY,
      metadata: {
        notificationId: notification.id,
        flow: 'signup-verification',
      },
    });

    // 5️⃣ Mark as sent
    await this.markAsSent(notification.id, {
      provider: 'resend',
    });
  }

  async sendRequestReset({
    token,
    email,
    locale,
    username,
    device,
    ip,
    location,
  }: SendResetLinkDTO) {
    this.logger.debug('creating Reset Link');

    const resetLink = `${APP_BASE_URL}${RESET_PATH}?token=${encodeURIComponent(token)}`;
    this.logger.debug('Created Reset Link %s', resetLink);

    const { templateId, renderedTitle, renderedBody } =
      await this.templateRenderService.renderFromKey({
        templateKey: 'auth.password-reset.request',
        channel: Channel.EMAIL,
        locale,
        variables: {
          username,
          actionUrl: resetLink,
          expiresInMinutes: 15,
          ip,
          device,
          location,
          requestTime: formatRequestTime(locale),
          supportEmail: FROM_SUPPORT,
        },
      });

    const notification = await this.create({
      tenantId: 'omnixys',
      recipientUsername: username,
      recipientAddress: email,
      channel: Channel.EMAIL,
      priority: Priority.NORMAL,
      templateId,
      variables: {
        firstName: username,
        actionUrl: resetLink,
        expiresInMinutes: 15,
        ip,
        device,
        location,
        requestTime: formatRequestTime(locale),
        supportEmail: FROM_SUPPORT,
      },
      metadata: {
        flow: 'create-passwort-reset-link',
      },
      sensitive: false,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      createdBy: 'notification-service',
    });

    // 4️⃣ Send Mail
    await this.mailService.send({
      to: email,
      subject: renderedTitle ?? '',
      html: renderedBody,
      format: 'HTML',
      from: FROM_NO_REPLY,
      replyTo: FROM_SUPPORT,
      metadata: {
        notificationId: notification.id,
        flow: 'create-passwort-reset-link',
      },
    });

    // 5️⃣ Mark as sent
    await this.markAsSent(notification.id, {
      provider: 'resend',
    });
  }
}
