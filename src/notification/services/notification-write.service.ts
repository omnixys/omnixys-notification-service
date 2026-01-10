/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/explicit-function-return-type */

/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { LoggerPlusService } from '../../logger/logger-plus.service.js';
import { KafkaProducerService } from '../../messaging/kafka-producer.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { TemplateReadService } from '../../template/services/template-read.service.js';
import { withSpan } from '../../trace/utils/span.utils.js';
import { safeJson } from '../../utils/safe-json.js';
import {
  PasswordResetRequestDTO,
  SecurityPasswordResetAlertDTO,
} from '../models/dto/password-reset.dto.js';
import { UserCredentialDTO } from '../models/dto/user-created-schema.dto.js';
import { Channel, toPrismaModelChannel } from '../models/enums/channel.enum.js';
import { NotificationStatus } from '../models/enums/notification-status.enum.js';
import { BulkSendInvitationsInput } from '../models/inputs/bulk-send-invitations.input.js';
import { NotificationInput } from '../models/inputs/notify.input.js';
import { NotificationRenderer, VariableSchema } from '../utils/notification.renderer.js';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { trace, Tracer } from '@opentelemetry/api';

const adminID = process.env.ADMIN_ID ?? 'dde8114c-2637-462a-90b9-413924fa3f55';

interface CreateOptions {
  dedupeKey?: string | null;
  publish?: boolean;
}

@Injectable()
export class NotificationWriteService {
  private readonly logger;
  private readonly tracer: Tracer;

  constructor(
    private readonly prisma: PrismaService,
    loggerService: LoggerPlusService,
    private readonly templateReadService: TemplateReadService,
    private readonly kafkaProducerService: KafkaProducerService,
    private readonly renderer: NotificationRenderer,
  ) {
    this.logger = loggerService.getLogger(NotificationWriteService.name);
    this.tracer = trace.getTracer(NotificationWriteService.name);
  }

  async sendCredentials(dto: UserCredentialDTO): Promise<void> {
    return withSpan(this.tracer, this.logger, 'notification.sendCredentials', async (span) => {
      // const channel = dto.phone ? Channel.WHATSAPP : Channel.EMAIL;

      await this.create(
        {
          recipientUsername: dto.username,
          // recipientId: dto.userId,
          // TODO fix this!
          recipientId: adminID,
          recipientTenant: undefined,

          templateKey: 'account.credentials.created',
          channel: Channel.IN_APP,
          locale: 'de-DE',

          variables: {
            username: dto.username,
            password: dto.password,
            firstName: dto.firstName,
          },

          sensitive: true,
          category: 'SECURITY',
        },
        {
          dedupeKey: `credentials:${dto.userId}`,
        },
      );

      const sc = span.spanContext();

      void this.kafkaProducerService.sendSubscription(dto, 'notification.write-service', {
        traceId: sc.traceId,
        spanId: sc.spanId,
      });
    });
  }

  async create(input: NotificationInput, opts: CreateOptions = {}) {
    this.logger.debug('create notification: %o', {
      ...input,
      variables: '[omitted]',
    });

    // 1️⃣ Resolve template by business key
    const template = await this.templateReadService.findActiveByKey(
      input.templateKey,
      input.channel,
      input.locale ?? 'de-DE',
    );

    // 2️⃣ Validate & render
    const variables = input.variables ?? {};
    this.renderer.validate((template.variables as unknown as VariableSchema) ?? {}, variables);

    const rendered = this.renderer.render(
      { title: template.title, body: template.body },
      variables,
    );

    this.logger.debug(
      'rendered notification vars=%o',
      this.renderer.maskSensitive(template.variables as any, variables),
    );

    // 3️⃣ TTL
    const expiresAt = input.ttlSeconds ? new Date(Date.now() + input.ttlSeconds * 1000) : null;

    // 4️⃣ Persist (idempotent)
    try {
      return await this.prisma.notification.create({
        data: {
          recipientUsername: input.recipientUsername,
          // recipientId: input.recipientId ?? null,
          // TODO fix this!
          recipientId: adminID,
          recipientTenant: input.recipientTenant ?? null,

          templateId: template.id,
          variables: safeJson(variables),
          renderedTitle: rendered.title,
          renderedBody: rendered.body,

          data: {},
          linkUrl: input.linkUrl ?? null,

          channel: toPrismaModelChannel(input.channel),
          priority: input.priority ?? 'NORMAL',
          category: input.category ?? template.category,

          status: NotificationStatus.PENDING,
          read: false,

          expiresAt,
          sensitive: input.sensitive ?? false,

          createdBy: 'notification-service',
          dedupeKey: opts.dedupeKey ?? null,
        },
      });
    } catch (e: any) {
      // Idempotency hit
      if (e?.code === 'P2002' && opts.dedupeKey) {
        const existing = await this.prisma.notification.findUnique({
          where: { dedupeKey: opts.dedupeKey },
        });

        if (existing) {
          return existing;
        }
      }

      throw e;
    }
  }

  async markAsRead(id: string): Promise<void> {
    const existing = await this.prisma.notification.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Notification not found');
    }
    if (existing.status === NotificationStatus.EXPIRED) {
      throw new BadRequestException('Expired notification cannot be read');
    }

    await this.prisma.notification.update({
      where: { id },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  async archive(id: string): Promise<void> {
    const existing = await this.prisma.notification.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.EXPIRED,
        archivedAt: new Date(),
      },
    });
  }

  async cleanupExpired(maxBatch = 500): Promise<number> {
    const expired = await this.prisma.notification.findMany({
      where: {
        expiresAt: { lte: new Date() },
        status: { not: NotificationStatus.EXPIRED },
      },
      take: maxBatch,
    });

    for (const n of expired) {
      await this.archive(n.id);
    }

    return expired.length;
  }

  async bulkSendInvitation(input: BulkSendInvitationsInput, userId: string) {
    return withSpan(this.tracer, this.logger, 'notification.sendFromTemplate', async (span) => {
      const template = await this.prisma.template.findUnique({
        where: { id: input.templateId },
      });

      if (!template?.isActive) {
        throw new Error('Template not found or inactive');
      }

      let created = 0;
      let skipped = 0;

      for (const recipient of input.recipients) {
        const channel = template.channel;

        if (channel === 'EMAIL' && !recipient.email) {
          skipped++;
          continue;
        }

        if (channel === 'WHATSAPP' && !recipient.phoneNumber) {
          skipped++;
          continue;
        }

        const notification = await this.createFromTemplate({
          templateId: template.id,
          channel,
          recipientUsername: channel === 'EMAIL' ? recipient.email! : recipient.phoneNumber!,
          variables: {
            firstName: recipient.firstName,
            lastName: recipient.lastName,
            rsvpUrl: recipient.rsvpUrl,
          },
          category: template.category ?? 'INVITATION',
          createdBy: userId,
        });

        created++;

        const sc = span.spanContext();

        void this.kafkaProducerService.sendNotification(
          {
            notificationId: notification.id,
            channel: channel as Channel,
            recipient: recipient.firstName,
            renderedTitle: notification.renderedTitle,
            renderedBody: notification.renderedBody,
            linkUrl: recipient.rsvpUrl ?? null,
          },
          'notification.write-service',
          {
            traceId: sc.traceId,
            spanId: sc.spanId,
          },
        );
      }

      return {
        total: input.recipients.length,
        created,
        skipped,
      };
    });
  }

  async createFromTemplate(input: {
    templateId: string;
    channel: string;
    recipientUsername: string;
    variables: Record<string, any>;
    category?: string;
    createdBy?: string;
  }) {
    const template = await this.prisma.template.findUniqueOrThrow({
      where: { id: input.templateId },
    });

    // 2️⃣ Validate & render
    const variables = input.variables ?? {};
    this.renderer.validate((template.variables as unknown as VariableSchema) ?? {}, variables);

    const rendered = this.renderer.render(
      { title: template.title, body: template.body },
      variables,
    );

    return this.prisma.notification.create({
      data: {
        recipientUsername: input.recipientUsername,
        templateId: template.id,
        variables: input.variables,
        renderedTitle: rendered.title,
        renderedBody: rendered.body,
        channel: template.channel,
        category: input.category,
        createdBy: input.createdBy,
      },
    });
  }

  async sendPasswordResetRequest(dto: PasswordResetRequestDTO): Promise<void> {
    return withSpan(this.tracer, this.logger, 'notification.sendPasswordResetRequest', async () => {
      await this.create(
        {
          recipientUsername: dto.recipientUsername, // email
          // recipientId: undefined,
          // TODO fix this!
          recipientId: adminID,
          recipientTenant: undefined,

          templateKey: 'account.password.reset.requested',
          channel: Channel.EMAIL,
          locale: 'de-DE',

          variables: {
            username: dto.recipientUsername,
            firstName: dto.firstName,
            lastName: dto.lastName,
            resetUrl: dto.resetUrl,
            requestedAt: dto.requestedAt,
            ipAddress: dto.ipAddress,
          },

          sensitive: true,
          category: 'SECURITY',
          ttlSeconds: 15 * 60, // 15 minutes
        },
        {
          dedupeKey: `password-reset:${dto.recipientUsername}:${dto.requestedAt}`,
        },
      );
    });
  }

  async sendSecurityPasswordResetAlert(dto: SecurityPasswordResetAlertDTO): Promise<void> {
    return withSpan(
      this.tracer,
      this.logger,
      'notification.sendSecurityPasswordResetAlert',
      async () => {
        await this.create(
          {
            recipientUsername: 'omnixys-security',
            // recipientId: undefined,
            // TODO fix this!
            recipientId: adminID,
            recipientTenant: undefined,

            templateKey: 'security.password.reset.requested',
            channel: Channel.IN_APP,
            locale: 'de-DE',

            variables: {
              username: dto.username,
              email: dto.email,
              requestedAt: dto.requestedAt,
              ipAddress: dto.ipAddress,
              alert: dto.alert,
            },

            sensitive: true,
            category: 'SECURITY',
          },
          {
            dedupeKey: `security-alert:password-reset:${dto.username}:${dto.requestedAt}`,
          },
        );
      },
    );
  }
}
