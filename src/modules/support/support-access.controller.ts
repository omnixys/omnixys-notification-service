import { env } from '../../config/env.js';
import { ConversationService } from './modules/conversation/conversation.service.js';
import {
  Controller,
  ForbiddenException,
  Get,
  Headers,
  NotFoundException,
  Query,
} from '@nestjs/common';
import { Public } from '@omnixys/security-ts';
import { timingSafeEqual } from 'node:crypto';

const { INTERNAL_GATEWAY_TOKEN } = env;

@Public()
@Controller('internal/support/access')
export class SupportAccessController {
  constructor(private readonly conversations: ConversationService) {}

  @Get('event')
  async eventAccess(
    @Headers('x-internal-token') token: string | undefined,
    @Query('eventId') eventId: string,
    @Query('userId') userId: string,
  ): Promise<{ eventId: string }> {
    assertInternalToken(token);
    if (
      !eventId ||
      !userId ||
      !(await this.conversations.canUserViewEventSupport(eventId, userId))
    ) {
      throw new ForbiddenException({ code: 'SUPPORT_ACCESS_DENIED' });
    }
    return { eventId };
  }

  @Get('conversation')
  async conversationAccess(
    @Headers('x-internal-token') token: string | undefined,
    @Query('conversationId') conversationId: string,
    @Query('userId') userId: string,
  ): Promise<{ conversationId: string; eventId: string }> {
    assertInternalToken(token);
    const access = await this.conversations.canUserAccessSubscription(conversationId, userId);
    if (!access.eventId) {
      throw new NotFoundException({ code: 'SUPPORT_CONVERSATION_NOT_FOUND' });
    }
    if (!access.allowed) {
      throw new ForbiddenException({ code: 'SUPPORT_ACCESS_DENIED' });
    }
    return { conversationId, eventId: access.eventId };
  }
}

function assertInternalToken(candidate: string | undefined): void {
  if (!candidate) {
    throw new ForbiddenException({ code: 'INTERNAL_TOKEN_INVALID' });
  }
  const expected = Buffer.from(INTERNAL_GATEWAY_TOKEN);
  const actual = Buffer.from(candidate);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new ForbiddenException({ code: 'INTERNAL_TOKEN_INVALID' });
  }
}
