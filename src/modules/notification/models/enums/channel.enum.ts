import type { Channel as PrismaChannel } from '../../../../prisma/generated/client.js';
import { registerEnumType } from '@nestjs/graphql';

export enum Channel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  WHATSAPP = 'WHATSAPP',
}
registerEnumType(Channel, { name: 'Channel' });

export function toPrismaModelChannel(
  channel: Channel | PrismaChannel | undefined,
): PrismaChannel {
  return channel as PrismaChannel;
}
