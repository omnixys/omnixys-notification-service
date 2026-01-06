/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { env } from '../../../config/env.js';
import { NotificationCreatedDTO } from '../../models/dto/notification-created.dto.js';
import { Channel } from '../../models/enums/channel.enum.js';
import { NotificationProvider } from '../notification-provider.interface.js';
import { Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';

const { SMTP_HOST, SMTP_PASS, SMTP_PORT, SMTP_USER } = env;
@Injectable()
export class EmailNotificationProvider implements NotificationProvider {
  private transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    pool: true,
  });

  supports(channel: string): boolean {
    return channel === Channel.EMAIL;
  }

  async send(event: NotificationCreatedDTO): Promise<void> {
    await this.transporter.sendMail({
      to: event.recipient,
      subject: event.renderedTitle ?? 'Einladung',
      html: event.renderedBody,
    });
  }
}
