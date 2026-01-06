/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
import { env } from '../../../config/env.js';
import { NotificationCreatedDTO } from '../../models/dto/notification-created.dto.js';
import { Channel } from '../../models/enums/channel.enum.js';
import { NotificationProvider } from '../notification-provider.interface.js';
import { Injectable } from '@nestjs/common';
import { request } from 'undici';

const { WHATSAPP_PHONE_ID, WHATSAPP_TOKEN } = env;
@Injectable()
export class WhatsAppNotificationProvider implements NotificationProvider {
  supports(channel: string): boolean {
    return channel === Channel.WHATSAPP;
  }

  async send(event: NotificationCreatedDTO): Promise<void> {
    const url = `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_ID}/messages`;

    const res = await request(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: event.recipient,
        type: 'text',
        text: {
          body: event.renderedBody,
        },
      }),
    });

    if (res.statusCode >= 300) {
      throw new Error(`WhatsApp API failed: ${res.statusCode}`);
    }
  }
}
